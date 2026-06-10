import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from 'src/database';
import logger from 'src/utils/logger';

@Injectable()
export class DiscordService {
  
  async getConfig() {
    // พยายามดึงการตั้งค่าจากฐานข้อมูล
    const config = await prisma.discordConfig.findFirst();
    if (config && config.botToken && config.channelId) {
      return {
        botToken: config.botToken,
        channelId: config.channelId,
        twitterCookies: config.twitterCookies,
      };
    }
    
    // หากไม่มีในฐานข้อมูล ให้ดึงจาก Environment Variables เป็นทางเลือกสำรอง
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_CHANNEL_ID;
    const twitterCookies = process.env.TWITTER_COOKIES || null;
    
    if (!botToken || !channelId) {
      throw new HttpException(
        'ไม่ได้ระบุบตั้งค่า Discord Bot Token หรือ Channel ID กรุณาไปตั้งค่าที่หน้าบอร์ดควบคุม',
        HttpStatus.BAD_REQUEST
      );
    }
    
    return { botToken, channelId, twitterCookies };
  }

  async testConnection(botToken: string, channelId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `https://discord.com/api/v10/channels/${channelId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        }
      );
      // ถ้ารหัสสเตตัสเป็น 200 แสดงว่าเชื่อมต่อห้องได้ปกติ
      return response.status === 200;
    } catch (error) {
      logger.error('Failed to connect to Discord channel', error.response?.data || error.message);
      return false;
    }
  }

  async saveConfig(botToken: string, channelId: string, twitterCookies?: string) {
    // ทำการทดสอบเชื่อมต่อก่อนเซฟ
    const isValid = await this.testConnection(botToken, channelId);
    if (!isValid) {
      throw new HttpException(
        'ไม่สามารถเชื่อมต่อกับบอทหรือช่องทาง Discord ดังกล่าวได้ กรุณาตรวจสอบความถูกต้อง',
        HttpStatus.BAD_REQUEST
      );
    }

    const config = await prisma.discordConfig.findFirst();
    if (config) {
      return await prisma.discordConfig.update({
        where: { id: config.id },
        data: { botToken, channelId, twitterCookies },
      });
    } else {
      return await prisma.discordConfig.create({
        data: { botToken, channelId, twitterCookies },
      });
    }
  }

  async uploadChunk(fileBuffer: Buffer, filename: string): Promise<{
    messageId: string;
    attachmentId: string;
    cdnUrl: string;
    expiresAt: Date;
  }> {
    const { botToken, channelId } = await this.getConfig();

    const form = new FormData();
    form.append('files[0]', fileBuffer, {
      filename,
      contentType: 'application/octet-stream',
    });

    try {
      const response = await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        form,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            ...form.getHeaders(),
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      const message = response.data;
      const attachment = message.attachments?.[0];

      if (!attachment) {
        throw new HttpException(
          'เกิดข้อผิดพลาดในการดึงข้อมูลไฟล์แนบจากการอัปโหลดไปยัง Discord',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // ดึงเวลาหมดอายุของ CDN จากพารามิเตอร์ `ex` (เลขฐาน 16 ของ Unix Timestamp วินาที)
      const urlObj = new URL(attachment.url);
      const hexEx = urlObj.searchParams.get('ex');
      let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // ค่าเริ่มต้น 24 ชั่วโมง

      if (hexEx) {
        const seconds = parseInt(hexEx, 16);
        if (!isNaN(seconds)) {
          expiresAt = new Date(seconds * 1000);
        }
      }

      return {
        messageId: message.id,
        attachmentId: attachment.id,
        cdnUrl: attachment.url,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error uploading file chunk to Discord', error.response?.data || error.message);
      throw new HttpException(
        `เกิดข้อผิดพลาดขณะส่งไฟล์ขึ้น Discord: ${error.response?.data?.message || error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async refreshAttachmentUrl(messageId: string): Promise<{ cdnUrl: string; expiresAt: Date }> {
    const { botToken, channelId } = await this.getConfig();

    try {
      const response = await axios.get(
        `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        }
      );

      const message = response.data;
      const attachment = message.attachments?.[0];

      if (!attachment) {
        throw new HttpException('ไม่พบไฟล์แนบในข้อความดังกล่าวบน Discord', HttpStatus.NOT_FOUND);
      }

      const urlObj = new URL(attachment.url);
      const hexEx = urlObj.searchParams.get('ex');
      let expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      if (hexEx) {
        const seconds = parseInt(hexEx, 16);
        if (!isNaN(seconds)) {
          expiresAt = new Date(seconds * 1000);
        }
      }

      return {
        cdnUrl: attachment.url,
        expiresAt,
      };
    } catch (error) {
      logger.error(`Error refreshing Discord attachment URL for message ${messageId}`, error.response?.data || error.message);
      throw new HttpException(
        `เกิดข้อผิดพลาดในการดึงลิงก์ใหม่จาก Discord: ${error.response?.data?.message || error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
