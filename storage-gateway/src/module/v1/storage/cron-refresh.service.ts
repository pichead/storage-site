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
      this.cleanupStuckUploads().catch((err) =>
        logger.error(`[Stuck Upload Cleanup Error] ${err.message}`)
      );
    }, 10000);

    // และทำงานต่อทุก ๆ 30 นาที
    this.intervalId = setInterval(
      () => {
        this.runPreemptiveRefresh().catch((err) =>
          logger.error(`[Pre-emptive Refresh Error] ${err.message}`)
        );
        this.cleanupStuckUploads().catch((err) =>
          logger.error(`[Stuck Upload Cleanup Error] ${err.message}`)
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

  async cleanupStuckUploads() {
    logger.info('[Stuck Upload Cleanup] เริ่มต้นสแกนหาการอัปโหลดที่ค้างในระบบ...');

    const CHUNK_SIZE = 8 * 1024 * 1024;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // ดึงไฟล์ทั้งหมดที่ไม่มี thumbnail หรือมีสิทธิ์เป็นไฟล์ที่ยังอัปโหลดไม่เสร็จ
    const files = await prisma.file.findMany({
      include: {
        chunks: {
          orderBy: { chunkIndex: 'desc' },
          take: 1, // ดึงเฉพาะชิ้นล่าสุดเพื่อเช็คเวลา
        },
      },
    });

    let deleteCount = 0;

    for (const file of files) {
      const expectedChunks = Math.ceil(file.size / CHUNK_SIZE);
      
      // ดึงจำนวน chunk ทั้งหมดใน DB ของไฟล์นี้
      const uploadedChunksCount = await prisma.fileChunk.count({
        where: { fileId: file.id },
      });

      if (uploadedChunksCount < expectedChunks) {
        let lastActiveTime = file.createdAt;
        if (file.chunks.length > 0) {
          lastActiveTime = file.chunks[0].createdAt;
        }

        if (lastActiveTime < oneHourAgo) {
          const inactiveMinutes = Math.round((Date.now() - lastActiveTime.getTime()) / (1000 * 60));
          logger.warn(
            `[Stuck Upload Cleanup] พบไฟล์ที่อัปโหลดค้าง: "${file.name}" (ID: ${file.id}) นิ่งไปแล้ว ${inactiveMinutes} นาที (อัปโหลดไปแล้ว ${uploadedChunksCount}/${expectedChunks} chunks). กำลังดำเนินการลบ...`
          );

          // ลบไฟล์ (จะมี Cascade Delete ลบ FileChunk ใน DB อัตโนมัติ)
          await prisma.file.delete({
            where: { id: file.id },
          });

          deleteCount++;
        }
      }
    }

    if (deleteCount > 0) {
      logger.info(`[Stuck Upload Cleanup] ลบการอัปโหลดที่ค้างเสร็จสิ้น จำนวน ${deleteCount} รายการ`);
    } else {
      logger.info('[Stuck Upload Cleanup] ไม่พบไฟล์อัปโหลดที่ค้างในระบบ');
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
