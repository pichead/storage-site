import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from 'src/database';
import { DiscordService } from '../discord/discord.service';
import { DiscordQueueService } from '../discord/discord-queue.service';
import logger from 'src/utils/logger';

@Injectable()
export class CronRefreshService implements OnModuleInit, OnModuleDestroy {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly discordService: DiscordService,
    private readonly discordQueueService: DiscordQueueService,
  ) {}

  onModuleInit() {
    // รันทันทีหลังจากโหลดโมดูลเสร็จ (หน่วงเวลาไว้ 10 วินาทีเพื่อให้ระบบเริ่มเสร็จก่อน)
    setTimeout(() => {
      this.runPreemptiveRefresh().catch((err) =>
        logger.error(`[Pre-emptive Refresh Error] ${err.message}`)
      );
    }, 10000);

    // และทำงานต่อทุก ๆ 30 นาที
    this.intervalId = setInterval(
      () => {
        this.runPreemptiveRefresh().catch((err) =>
          logger.error(`[Pre-emptive Refresh Error] ${err.message}`)
        );
      },
      30 * 60 * 1000 // 30 minutes
    );

    logger.info('[Cron Refresh Service] Pre-emptive URL Refresh Service initialized (interval: 30 mins)');
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async runPreemptiveRefresh() {
    logger.info('[Pre-emptive Refresh] เริ่มต้นสแกนหาชิ้นส่วนไฟล์ที่ใกล้หมดอายุทั้งหมดในระบบ...');

    // 1. ค้นหาชิ้นส่วน (Chunks) ทั้งหมดในระบบที่กำลังจะหมดอายุในอีก 3 ชั่วโมงข้างหน้า
    const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const expiringChunks = await prisma.fileChunk.findMany({
      where: {
        cdnExpiresAt: {
          lte: threeHoursFromNow,
        },
      },
      include: {
        file: {
          select: {
            name: true,
          },
        },
      },
    });

    if (expiringChunks.length === 0) {
      logger.info('[Pre-emptive Refresh] ไม่พบชิ้นส่วนไฟล์ใด ๆ ในระบบที่ใกล้หมดอายุใน 3 ชม.');
      return;
    }

    logger.info(
      `[Pre-emptive Refresh] พบชิ้นส่วนไฟล์ใกล้หมดอายุในระบบจำนวน ${expiringChunks.length} ชิ้นส่วน กำลังจัดเตรียมส่งรีเฟรชผ่านคิวแบบเงียบ ๆ`
    );

    // 3. ทยอยส่งรีเฟรชเข้าคิวลำดับความสำคัญต่ำ (low priority) ทีละชิ้น
    for (const chunk of expiringChunks) {
      this.discordQueueService.enqueue(
        async () => {
          try {
            logger.info(
              `[Pre-emptive Refresh] กำลังรีเฟรชลิงก์ล่วงหน้าสำหรับไฟล์ "${chunk.file.name}" ชิ้นที่ ${chunk.chunkIndex}`
            );
            const refreshed = await this.discordService.refreshAttachmentUrl(
              chunk.discordMessageId,
              chunk.discordChannelId || undefined
            );

            await prisma.fileChunk.update({
              where: { id: chunk.id },
              data: {
                cdnUrl: refreshed.cdnUrl,
                cdnExpiresAt: refreshed.expiresAt,
              },
            });

            logger.info(
              `[Pre-emptive Refresh] รีเฟรชสำเร็จ! ไฟล์ "${chunk.file.name}" ชิ้นที่ ${chunk.chunkIndex} (หมดอายุใหม่: ${refreshed.expiresAt.toISOString()})`
            );
          } catch (err) {
            logger.error(
              `[Pre-emptive Refresh] รีเฟรชล้มเหลวสำหรับไฟล์ "${chunk.file.name}" ชิ้นที่ ${chunk.chunkIndex}: ${err.message}`
            );
          }
        },
        'low'
      ).catch((err) => {
        logger.error(`[Pre-emptive Refresh] ข้อผิดพลาดขณะรันในคิว: ${err.message}`);
      });
    }
  }
}
