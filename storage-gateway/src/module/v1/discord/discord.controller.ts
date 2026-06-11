import { Controller, Get, Post, Body, UseGuards, Param, Delete } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { JwtGuard } from 'src/common/guard/jwt.guard';
import { RES } from 'src/utils';

@Controller('discord')
@UseGuards(JwtGuard)
export class DiscordController {
  constructor(private readonly discordService: DiscordService) {}

  @Post('config')
  async saveConfig(
    @Body('botToken') botToken: string,
    @Body('channelId') channelId: string,
    @Body('twitterCookies') twitterCookies?: string,
  ) {
    if (!botToken || !channelId) {
      return RES.error(400, 'Bot token and channel ID are required', 'กรุณาระบุ Bot Token และ Channel ID');
    }
    const result = await this.discordService.saveConfig(botToken, channelId, twitterCookies);
    return RES.ok(200, 'Discord configuration saved successfully', 'บันทึกการตั้งค่า Discord สำเร็จ', {
      id: result.id,
      channelId: result.channelId,
    });
  }

  @Get('config')
  async getConfig() {
    const config = await this.discordService.getConfig().catch(() => null);
    if (!config) {
      return RES.ok(200, 'Discord is not configured yet', 'ยังไม่ได้ตั้งค่า Discord', null);
    }
    // ทำการ Masking รหัส Token เพื่อความปลอดภัยในการส่งข้อมูลกลับไปแสดงผล
    const botToken = config.botToken || '';
    const maskedToken = botToken.length > 15
      ? `${botToken.substring(0, 8)}...${botToken.substring(botToken.length - 8)}`
      : '********';
    return RES.ok(200, 'Discord configuration retrieved', 'ดึงข้อมูลตั้งค่าสำเร็จ', {
      channelId: config.channelId,
      botToken: maskedToken,
      twitterCookies: config.twitterCookies || '',
    });
  }

  @Post('test-connection')
  async testConnection(
    @Body('botToken') botToken: string,
    @Body('channelId') channelId: string,
  ) {
    if (!botToken || !channelId) {
      return RES.error(400, 'Bot token and channel ID are required', 'กรุณาระบุ Bot Token และ Channel ID');
    }
    const isConnected = await this.discordService.testConnection(botToken, channelId);
    if (!isConnected) {
      return RES.error(400, 'Failed to connect to Discord', 'เชื่อมต่อไปยัง Discord ล้มเหลว');
    }
    return RES.ok(200, 'Connected to Discord successfully', 'เชื่อมต่อไปยัง Discord สำเร็จ', null);
  }

  @Get('pool')
  async getPool() {
    const result = await this.discordService.getPool();
    return RES.ok(200, 'Discord pool accounts retrieved successfully', 'ดึงข้อมูลสระบอทสำเร็จ', result);
  }

  @Post('pool')
  async addPoolAccount(
    @Body('botToken') botToken: string,
    @Body('channelId') channelId: string,
  ) {
    if (!botToken || !channelId) {
      return RES.error(400, 'Bot token and channel ID are required', 'กรุณาระบุ Bot Token และ Channel ID');
    }
    const result = await this.discordService.addPoolAccount(botToken, channelId);
    return RES.ok(200, 'Bot added to pool successfully', 'เพิ่มบอทเข้าระบบสำเร็จ', {
      id: result.id,
      channelId: result.channelId,
    });
  }

  @Delete('pool/:id')
  async deletePoolAccount(@Param('id') id: string) {
    await this.discordService.deletePoolAccount(id);
    return RES.ok(200, 'Bot deleted from pool successfully', 'ลบบอทออกจากระบบสำเร็จ', null);
  }
}
