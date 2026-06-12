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
      const response = await this.requestWithRetry(() =>
        axios.get(
          `https://discord.com/api/v10/channels/${channelId}`,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
          }
        )
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

  // ดึงบอทที่จะใช้อัปโหลดชิ้นส่วนถัดไป (หมุนเวียนระหว่าง บอทหลัก และ บอทใน Pool)
  private uploadCounter = 0;
  async getNextUploadAccount(): Promise<{ botToken: string; channelId: string }> {
    const mainConfig = await this.getConfig().catch(() => null);
    const accounts: Array<{ botToken: string; channelId: string }> = [];

    if (mainConfig && mainConfig.botToken && mainConfig.channelId) {
      accounts.push({ botToken: mainConfig.botToken, channelId: mainConfig.channelId });
    }

    const poolAccounts = await prisma.discordAccountPool.findMany({
      where: { isActive: true },
    });

    for (const pool of poolAccounts) {
      accounts.push({ botToken: pool.botToken, channelId: pool.channelId });
    }

    if (accounts.length === 0) {
      throw new HttpException(
        'ไม่พบบัญชี Discord บอทในระบบ กรุณาตั้งค่าที่หน้าบอร์ดควบคุม',
        HttpStatus.BAD_REQUEST
      );
    }

    const selected = accounts[this.uploadCounter % accounts.length];
    this.uploadCounter++;
    return selected;
  }

  async getPool() {
    const pool = await prisma.discordAccountPool.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return pool.map((item) => {
      const token = item.botToken || '';
      const maskedToken = token.length > 15
        ? `${token.substring(0, 8)}...${token.substring(token.length - 8)}`
        : '********';
      return {
        id: item.id,
        channelId: item.channelId,
        botToken: maskedToken,
        isActive: item.isActive,
        createdAt: item.createdAt,
      };
    });
  }

  async addPoolAccount(botToken: string, channelId: string) {
    const isValid = await this.testConnection(botToken, channelId);
    if (!isValid) {
      throw new HttpException(
        'ไม่สามารถเชื่อมต่อกับบอทหรือช่องทาง Discord ดังกล่าวได้ กรุณาตรวจสอบความถูกต้อง',
        HttpStatus.BAD_REQUEST
      );
    }

    return await prisma.discordAccountPool.create({
      data: {
        botToken,
        channelId,
        isActive: true,
      },
    });
  }

  async deletePoolAccount(id: string) {
    return await prisma.discordAccountPool.delete({
      where: { id },
    });
  }

  async uploadChunk(fileBuffer: Buffer, filename: string): Promise<{
    messageId: string;
    attachmentId: string;
    cdnUrl: string;
    expiresAt: Date;
    channelId: string;
  }> {
    const { botToken, channelId } = await this.getNextUploadAccount();

    try {
      const response = await this.requestWithRetry(() => {
        const form = new FormData();
        form.append('files[0]', fileBuffer, {
          filename,
          contentType: 'application/octet-stream',
        });

        return axios.post(
          `https://discord.com/api/v10/channels/${channelId}/messages`,
          form,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
              ...form.getHeaders(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000, // 2-minute timeout to prevent hanging the queue
          }
        );
      });

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
        channelId,
      };
    } catch (error) {
      logger.error('Error uploading file chunk to Discord', error.response?.data || error.message);
      throw new HttpException(
        `เกิดข้อผิดพลาดขณะส่งไฟล์ขึ้น Discord: ${error.response?.data?.message || error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async refreshAttachmentUrl(messageId: string, customChannelId?: string): Promise<{ cdnUrl: string; expiresAt: Date }> {
    let botToken: string;
    let channelId: string;

    if (customChannelId) {
      const poolAccount = await prisma.discordAccountPool.findFirst({
        where: { channelId: customChannelId, isActive: true },
      });

      if (poolAccount) {
        botToken = poolAccount.botToken;
        channelId = poolAccount.channelId;
      } else {
        const mainConfig = await this.getConfig().catch(() => null);
        if (mainConfig && mainConfig.channelId === customChannelId) {
          botToken = mainConfig.botToken;
          channelId = mainConfig.channelId;
        } else {
          if (mainConfig) {
            botToken = mainConfig.botToken;
            channelId = mainConfig.channelId;
          } else {
            throw new HttpException('ไม่พบการตั้งค่าช่อง Discord ที่ต้องการรีเฟรช', HttpStatus.NOT_FOUND);
          }
        }
      }
    } else {
      const mainConfig = await this.getConfig();
      botToken = mainConfig.botToken;
      channelId = mainConfig.channelId;
    }

    try {
      const response = await this.requestWithRetry(() =>
        axios.get(
          `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
          {
            headers: {
              Authorization: `Bot ${botToken}`,
            },
            timeout: 30000, // 30-second timeout to prevent hanging the queue
          }
        )
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

  private async requestWithRetry<T>(requestFn: () => Promise<T>, maxRetries = 5): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        return await requestFn();
      } catch (error: any) {
        attempts++;
        const status = error.response?.status;
        const responseData = error.response?.data;

        if (status === 429 && attempts < maxRetries) {
          const retryAfter = responseData?.retry_after ?? 1.5; // default 1.5 วินาทีหากไม่มีค่าระบุ
          const delayMs = Math.ceil(retryAfter * 1000) + 200; // เพิ่มดีเลย์ 200ms เผื่อความคลาดเคลื่อน

          logger.warn(
            `[Discord Rate Limit] ถูกจำกัดอัตราการเรียกใช้ (HTTP 429) จะทำรายการใหม่ในอีก ${retryAfter} วินาที (ครั้งที่ ${attempts}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        throw error;
      }
    }
    throw new Error('ดำเนินการเรียกใช้งาน Discord API ไม่สำเร็จเนื่องจากเกิด Rate Limit เกินจำนวนครั้งที่กำหนด');
  }
}
