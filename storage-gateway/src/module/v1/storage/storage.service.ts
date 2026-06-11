import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { prisma } from 'src/database';
import { RES } from 'src/utils';
import { DiscordService } from '../discord/discord.service';
import { DiscordQueueService } from '../discord/discord-queue.service';
import logger from 'src/utils/logger';
import axios from 'axios';
import { Request, Response } from 'express';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  constructor(
    private readonly discordService: DiscordService,
    private readonly discordQueueService: DiscordQueueService,
  ) { }

  // urlDownloadTasks was migrated to MySQL database Table UrlDownloadTask

  // ==========================================
  // FOLDERS MANAGEMENT (การจัดการโฟลเดอร์)
  // ==========================================

  async createFolder(name: string, parentId: string | null, userId: string) {
    try {
      if (!name) {
        return RES.error(400, 'Folder name is required', 'กรุณาระบุชื่อโฟลเดอร์');
      }

      // ตรวจสอบโฟลเดอร์หลักว่ามีอยู่และเป็นของ User คนนี้จริงหรือไม่
      if (parentId) {
        const parent = await prisma.folder.findFirst({
          where: { id: parentId, userId },
        });
        if (!parent) {
          return RES.error(404, 'Parent folder not found', 'ไม่พบโฟลเดอร์หลักที่ระบุ');
        }
      }

      const folder = await prisma.folder.create({
        data: {
          name,
          parentId: parentId || null,
          userId,
        },
      });

      return RES.ok(201, 'Folder created successfully', 'สร้างโฟลเดอร์สำเร็จ', folder);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async listFolderContents(parentId: string | null, userId: string) {
    try {
      // ดึงโฟลเดอร์ย่อยทั้งหมดที่อยู่ในโฟลเดอร์นี้
      const folders = await prisma.folder.findMany({
        where: {
          parentId: parentId || null,
          userId,
        },
        orderBy: { name: 'asc' },
      });

      // ดึงไฟล์ทั้งหมดที่อยู่ในโฟลเดอร์นี้
      const files = await prisma.file.findMany({
        where: {
          folderId: parentId || null,
          userId,
        },
        orderBy: { name: 'asc' },
      });

      // ดึงข้อมูล breadcrumbs path (โครงสร้างโฟลเดอร์ย้อนกลับขึ้นไปถึง root)
      const path: any[] = [];
      if (parentId) {
        let currentFolder = await prisma.folder.findFirst({
          where: { id: parentId, userId },
        });
        while (currentFolder) {
          path.unshift({ id: currentFolder.id, name: currentFolder.name });
          if (currentFolder.parentId) {
            currentFolder = await prisma.folder.findFirst({
              where: { id: currentFolder.parentId, userId },
            });
          } else {
            currentFolder = null;
          }
        }
      }

      return RES.ok(200, 'Retrieved folder contents', 'ดึงข้อมูลเนื้อหาโฟลเดอร์สำเร็จ', {
        folders,
        files,
        path,
      });
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async renameFolder(id: string, name: string, userId: string) {
    try {
      if (!name) {
        return RES.error(400, 'Folder name is required', 'กรุณาระบุชื่อโฟลเดอร์');
      }

      const folder = await prisma.folder.findFirst({
        where: { id, userId },
      });
      if (!folder) {
        return RES.error(404, 'Folder not found', 'ไม่พบโฟลเดอร์ที่ระบุ');
      }

      const updated = await prisma.folder.update({
        where: { id },
        data: { name },
      });

      return RES.ok(200, 'Folder renamed successfully', 'เปลี่ยนชื่อโฟลเดอร์สำเร็จ', updated);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async deleteFolder(id: string, userId: string) {
    try {
      const folder = await prisma.folder.findFirst({
        where: { id, userId },
      });
      if (!folder) {
        return RES.error(404, 'Folder not found', 'ไม่พบโฟลเดอร์ที่ระบุ');
      }

      // ลบข้อมูลแบบ Recursive (เพื่อเคลียร์ไฟล์และโฟลเดอร์ย่อยทั้งหมด รวมถึงลบข้อมูลออกจาก Discord ด้วย)
      await this.deleteFolderRecursively(id, userId);

      return RES.ok(200, 'Folder deleted successfully', 'ลบโฟลเดอร์สำเร็จ', null);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  private async deleteFolderRecursively(folderId: string, userId: string) {
    // 1. ดึงโฟลเดอร์ย่อยทั้งหมดที่ซ้อนอยู่ข้างใน
    const subfolders = await prisma.folder.findMany({
      where: { parentId: folderId, userId },
    });

    for (const sub of subfolders) {
      await this.deleteFolderRecursively(sub.id, userId);
    }

    // 2. ดึงไฟล์ทั้งหมดและสั่งลบไฟล์ (รวมไฟล์ในห้อง Discord)
    const files = await prisma.file.findMany({
      where: { folderId, userId },
    });

    for (const file of files) {
      await this.deleteFileInternal(file.id, userId);
    }

    // 3. ลบตัวโฟลเดอร์หลักเอง
    await prisma.folder.delete({
      where: { id: folderId },
    });
  }

  async moveFolder(id: string, targetParentId: string | null, userId: string) {
    try {
      // ตรวจสอบว่าโฟลเดอร์ต้นทางมีอยู่และเป็นของ user
      const folder = await prisma.folder.findFirst({ where: { id, userId } });
      if (!folder) {
        return RES.error(404, 'Folder not found', 'ไม่พบโฟลเดอร์ที่ต้องการย้าย');
      }

      // ห้ามย้ายโฟลเดอร์เข้าไปใน subfolder ของตัวเอง (กัน circular reference)
      if (targetParentId) {
        const isDescendant = await this.isDescendantFolder(targetParentId, id, userId);
        if (isDescendant || targetParentId === id) {
          return RES.error(400, 'Cannot move folder into its own subfolder', 'ไม่สามารถย้ายโฟลเดอร์เข้าไปในโฟลเดอร์ย่อยของตัวเองได้');
        }

        const targetFolder = await prisma.folder.findFirst({ where: { id: targetParentId, userId } });
        if (!targetFolder) {
          return RES.error(404, 'Target folder not found', 'ไม่พบโฟลเดอร์ปลายทาง');
        }
      }

      const updated = await prisma.folder.update({
        where: { id },
        data: { parentId: targetParentId || null },
      });

      return RES.ok(200, 'Folder moved successfully', 'ย้ายโฟลเดอร์สำเร็จ', updated);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  // ตรวจสอบว่า candidateId เป็น descendant ของ ancestorId หรือไม่
  private async isDescendantFolder(candidateId: string, ancestorId: string, userId: string): Promise<boolean> {
    let currentId: string | null = candidateId;
    while (currentId) {
      if (currentId === ancestorId) return true;
      const folder = await prisma.folder.findFirst({ where: { id: currentId, userId } });
      currentId = folder?.parentId ?? null;
    }
    return false;
  }

  async moveFile(id: string, targetFolderId: string | null, userId: string) {
    try {
      const file = await prisma.file.findFirst({ where: { id, userId } });
      if (!file) {
        return RES.error(404, 'File not found', 'ไม่พบไฟล์ที่ต้องการย้าย');
      }

      if (targetFolderId) {
        const targetFolder = await prisma.folder.findFirst({ where: { id: targetFolderId, userId } });
        if (!targetFolder) {
          return RES.error(404, 'Target folder not found', 'ไม่พบโฟลเดอร์ปลายทาง');
        }
      }

      const updated = await prisma.file.update({
        where: { id },
        data: { folderId: targetFolderId || null },
      });

      return RES.ok(200, 'File moved successfully', 'ย้ายไฟล์สำเร็จ', updated);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  // ==========================================
  // FILES UPLOAD FLOW (ขั้นตอนการอัปโหลดไฟล์)
  // ==========================================


  async initiateUpload(name: string, mimetype: string, size: number, folderId: string | null, userId: string) {
    try {
      logger.info(`[Upload] Initiating upload for file: "${name}" (mimetype: ${mimetype}, size: ${size} bytes, folderId: ${folderId || 'root'})`);

      if (!name || !mimetype || size === undefined) {
        return RES.error(400, 'Missing file parameters', 'ข้อมูลไฟล์ไม่ครบถ้วน');
      }

      if (folderId) {
        const folder = await prisma.folder.findFirst({
          where: { id: folderId, userId },
        });
        if (!folder) {
          return RES.error(404, 'Folder not found', 'ไม่พบโฟลเดอร์เป้าหมาย');
        }
      }

      let resolvedMimetype = mimetype;
      if (name.toLowerCase().endsWith('.mkv') && (mimetype === 'application/octet-stream' || !mimetype)) {
        resolvedMimetype = 'video/x-matroska';
      } else if (name.toLowerCase().endsWith('.mov') && (mimetype === 'application/octet-stream' || !mimetype)) {
        resolvedMimetype = 'video/quicktime';
      }

      const file = await prisma.file.create({
        data: {
          name,
          mimetype: resolvedMimetype,
          size,
          folderId: folderId || null,
          userId,
        },
      });

      logger.info(`[Upload] Successfully created file record in DB. File ID: ${file.id}`);
      return RES.ok(200, 'Upload initiated', 'เริ่มต้นอัปโหลดสำเร็จ', { fileId: file.id });
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async uploadChunk(fileId: string, chunkIndex: number, size: number, fileBuffer: Buffer, userId: string) {
    try {
      logger.info(`[Upload] Starting upload of chunk ${chunkIndex} (size: ${size} bytes) for file ID: ${fileId}`);

      // ตรวจสอบสถานะและสิทธิ์ของไฟล์
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId },
      });
      if (!file) {
        return RES.error(404, 'File session not found', 'ไม่พบประวัติการอัปโหลดไฟล์นี้');
      }

      // ตั้งชื่อไฟล์ชั่วคราวสำหรับส่งไปเก็บที่ Discord
      const chunkFilename = `${fileId}_chunk_${chunkIndex}`;

      // อัปเดตขึ้น Discord ผ่านระบบ Queue ลำดับความสำคัญต่ำ
      const discordUpload = await this.discordQueueService.enqueue(
        () => this.discordService.uploadChunk(fileBuffer, chunkFilename),
        'low'
      );

      // บันทึกชิ้นส่วนไฟล์ลงฐานข้อมูล
      const chunk = await prisma.fileChunk.create({
        data: {
          fileId,
          chunkIndex,
          size,
          discordMessageId: discordUpload.messageId,
          discordAttachmentId: discordUpload.attachmentId,
          discordChannelId: discordUpload.channelId,
          cdnUrl: discordUpload.cdnUrl,
          cdnExpiresAt: discordUpload.expiresAt,
        },
      });

      logger.info(`[Upload] Chunk ${chunkIndex} uploaded to Discord (messageId: ${discordUpload.messageId}) and recorded in DB (chunkId: ${chunk.id})`);
      return RES.ok(201, 'Chunk uploaded successfully', 'อัปโหลดชิ้นส่วนไฟล์สำเร็จ', {
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
      });
    } catch (error) {
      logger.error(error);
      throw new HttpException(
        error.message || 'เกิดข้อผิดพลาดระหว่างอัปโหลด Chunk',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async completeUpload(fileId: string, thumbnail: string | null, userId: string) {
    try {
      logger.info(`[Upload] Completing upload process for file ID: ${fileId}`);

      const file = await prisma.file.findFirst({
        where: { id: fileId, userId },
      });
      if (!file) {
        return RES.error(404, 'File not found', 'ไม่พบไฟล์ที่ต้องการตั้งค่าสิ้นสุด');
      }

      const updated = await prisma.file.update({
        where: { id: fileId },
        data: {
          thumbnail, // เก็บ Base64 preview สำหรับรูปภาพและวิดีโอ
        },
      });

      logger.info(`[Upload] File upload successfully completed and finalized for file: "${file.name}" (ID: ${fileId})`);
      return RES.ok(200, 'File upload completed successfully', 'บันทึกอัปโหลดเสร็จสิ้นสำเร็จ', updated);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  // ==========================================
  // FILES DOWNLOAD FLOW (ขั้นตอนการดาวน์โหลดไฟล์)
  // ==========================================

  async downloadFile(fileId: string, userId: string, req: Request, res: Response, preview?: boolean) {
    try {
      logger.info(`[Download] Received download request for file ID: ${fileId}`);

      // 1. ดึงประวัติและชิ้นส่วนของไฟล์แบบเรียงลำดับ
      const file = await prisma.file.findFirst({
        where: { id: fileId, userId },
        include: {
          chunks: {
            orderBy: { chunkIndex: 'asc' },
          },
        },
      });

      if (!file) {
        logger.warn(`[Download] File with ID ${fileId} not found in DB`);
        res.status(404).json(RES.error(404, 'File not found', 'ไม่พบไฟล์ที่ต้องการดาวน์โหลด'));
        return;
      }

      // อัปเดตประวัติการเข้าใช้งานล่าสุดของไฟล์
      prisma.file.update({
        where: { id: fileId },
        data: { lastAccessedAt: new Date() },
      }).catch((err) => logger.error(`Failed to update lastAccessedAt: ${err.message}`));

      logger.info(`[Download] Found file: "${file.name}" (size: ${file.size} bytes, mimetype: ${file.mimetype}), range requested: ${req.headers.range || 'none'}`);

      if (file.chunks.length === 0) {
        res.status(400).json(RES.error(400, 'File contains no chunks', 'ไฟล์นี้ไม่มีชิ้นส่วนเก็บอยู่'));
        return;
      }

      const totalSize = file.size;
      let start = 0;
      let end = totalSize - 1;
      let isRange = false;

      // วิเคราะห์หัวข้อ Range Request ของบราวเซอร์
      const rangeHeader = req.headers.range;
      if (rangeHeader && rangeHeader.startsWith('bytes=')) {
        isRange = true;
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const partialStart = parts[0];
        const partialEnd = parts[1];

        start = parseInt(partialStart, 10);
        end = partialEnd ? parseInt(partialEnd, 10) : totalSize - 1;

        if (isNaN(start)) start = 0;
        if (isNaN(end)) end = totalSize - 1;

        if (start >= totalSize) {
          res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
          return;
        }
        if (end >= totalSize) {
          end = totalSize - 1;
        }
      }

      if (isRange) {
        // จำกัดขนาดการตอบกลับสูงสุดต่อ 1 Request ไม่เกิน 8MB (1 Chunk) เพื่อให้บัฟเฟอร์เร็วและกดข้าม (Seek) ได้ทันที
        const maxResponseSize = 8 * 1024 * 1024;
        if (end - start + 1 > maxResponseSize) {
          end = start + maxResponseSize - 1;
        }
        if (end >= totalSize) {
          end = totalSize - 1;
        }
      }

      const contentLength = end - start + 1;

      // ตั้งค่า Header สำหรับมีเดียสตรีมมิ่ง
      res.setHeader('Content-Type', file.mimetype);
      res.setHeader('Accept-Ranges', 'bytes');

      const encodedName = encodeURIComponent(file.name);
      const disposition = preview ? 'inline' : 'attachment';
      res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodedName}`);

      if (isRange) {
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', contentLength);
      } else {
        res.status(200);
        res.setHeader('Content-Length', totalSize);
      }

      // คำนวณช่วงไบต์ (Start/End) ของแต่ละ Chunk สะสมรวม
      let currentOffset = 0;
      const chunksWithPositions = file.chunks.map((chunk) => {
        const chunkStart = currentOffset;
        const chunkEnd = currentOffset + chunk.size - 1;
        currentOffset += chunk.size;
        return {
          ...chunk,
          start: chunkStart,
          end: chunkEnd,
        };
      });

      // กรองเฉพาะ Chunk ที่ครอบคลุมช่วงไบต์ที่บราวเซอร์ขอ
      const requiredChunks = chunksWithPositions.filter((chunk) => {
        return chunk.end >= start && chunk.start <= end;
      });

      // ดึงชิ้นส่วนย่อยและจัดส่ง
      for (const chunk of requiredChunks) {
        let downloadUrl = chunk.cdnUrl;

        // ตรวจสอบวันหมดอายุลิงก์ CDN
        const isExpired = new Date(Date.now() + 5 * 60 * 1000) > new Date(chunk.cdnExpiresAt);
        if (isExpired) {
          try {
            logger.info(`Refreshing CDN URL for chunk ${chunk.chunkIndex} of file ${file.name}`);
            
            // เรียกใช้งาน Refresh ลิงก์ผ่าน Queue ลำดับความสำคัญสูง (HIGH)
            const refreshed = await this.discordQueueService.enqueue(
              () => this.discordService.refreshAttachmentUrl(chunk.discordMessageId, chunk.discordChannelId || undefined),
              'high'
            );

            await prisma.fileChunk.update({
              where: { id: chunk.id },
              data: {
                cdnUrl: refreshed.cdnUrl,
                cdnExpiresAt: refreshed.expiresAt,
              },
            });
            downloadUrl = refreshed.cdnUrl;
          } catch (err) {
            logger.error(`Failed to refresh chunk URL: ${err.message}`);
          }
        }

        // ส่งคำขอช่วงไบต์ (Range Request) ต่อไปยัง Discord CDN เพื่อดึงเฉพาะไบต์ที่ต้องการและพ่นสตรีมทันที
        try {
          const sliceStart = Math.max(0, start - chunk.start);
          const sliceEnd = Math.min(chunk.size - 1, end - chunk.start);
          const discordRangeHeader = `bytes=${sliceStart}-${sliceEnd}`;

          logger.info(`[Download] Streaming chunk ${chunk.chunkIndex} of file "${file.name}" (bytes range: ${sliceStart}-${sliceEnd} in chunk)`);

          const chunkResponse = await axios.get(downloadUrl, {
            responseType: 'stream',
            headers: {
              Range: discordRangeHeader,
            },
            timeout: 60000,
          });

          // สตรีมข้อมูลจาก Discord ไปยังบราวเซอร์โดยตรงแบบ Real-time
          await new Promise<void>((resolve, reject) => {
            chunkResponse.data.pipe(res, { end: false });
            chunkResponse.data.on('end', () => {
              resolve();
            });
            chunkResponse.data.on('error', (err: any) => {
              reject(err);
            });
          });
        } catch (downloadErr) {
          logger.error(`Error downloading range from Discord CDN for chunk ${chunk.chunkIndex}`, downloadErr.message);
          res.end();
          return;
        }
      }

      logger.info(`[Download] Successfully finished streaming file: "${file.name}" (ID: ${file.id})`);
      res.end();
    } catch (error) {
      logger.error(error);
      if (!res.headersSent) {
        res.status(500).json(RES.errorSystem());
      }
    }
  }

  // ==========================================
  async renameFile(id: string, name: string, userId: string) {
    try {
      if (!name) {
        return RES.error(400, 'File name is required', 'กรุณาระบุชื่อไฟล์');
      }

      const file = await prisma.file.findFirst({
        where: { id, userId },
      });
      if (!file) {
        return RES.error(404, 'File not found', 'ไม่พบไฟล์ที่ระบุ');
      }

      const updated = await prisma.file.update({
        where: { id },
        data: { name },
      });

      return RES.ok(200, 'File renamed successfully', 'เปลี่ยนชื่อไฟล์สำเร็จ', updated);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  // ==========================================
  // FILES DELETE FLOW (ขั้นตอนการลบไฟล์และบ๊ายบายบอทดิส)
  // ==========================================

  async deleteFile(id: string, userId: string) {
    try {
      const isDeleted = await this.deleteFileInternal(id, userId);
      if (!isDeleted) {
        return RES.error(404, 'File not found', 'ไม่พบไฟล์ที่ต้องการลบ');
      }
      return RES.ok(200, 'File deleted successfully', 'ลบไฟล์สำเร็จ', null);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  private async deleteFileInternal(id: string, userId: string): Promise<boolean> {
    const file = await prisma.file.findFirst({
      where: { id, userId },
      include: { chunks: true },
    });

    if (!file) {
      return false;
    }

    // ลบไฟล์ใน DB (และ Cascade ลบ Chunks ออกทันทีตาม FK constraint)
    await prisma.file.delete({
      where: { id },
    });

    return true;
  }

  // ==========================================
  // URL DOWNLOADER FLOW (การดาวน์โหลดผ่าน URL)
  // ==========================================

  async getUrlDownloadTasks(userId: string) {
    const userTasks = await prisma.urlDownloadTask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return RES.ok(200, 'Retrieved download tasks', 'ดึงข้อมูลงานดาวน์โหลดสำเร็จ', userTasks);
  }

  async startUrlDownload(url: string, folderId: string | null, userId: string) {
    if (!url) {
      return RES.error(400, 'URL is required', 'กรุณาระบุ URL วิดีโอ');
    }

    const task = await prisma.urlDownloadTask.create({
      data: {
        userId,
        url,
        name: 'กำลังดึงข้อมูลลิงก์...',
        progress: 0,
        status: 'fetching_info',
        folderId,
      },
    });

    // เริ่มรันในเบื้องหลัง
    this.runBackgroundUrlDownload(task.id, url, folderId, userId);

    return RES.ok(200, 'Download started in background', 'เริ่มการดาวน์โหลดในเบื้องหลังแล้ว', { taskId: task.id });
  }

  private async runBackgroundUrlDownload(taskId: string, url: string, folderId: string | null, userId: string) {
    const updateTask = async (updates: any) => {
      try {
        await prisma.urlDownloadTask.update({
          where: { id: taskId },
          data: updates,
        });
      } catch (err) {
        logger.error(`Failed to update task ${taskId} in DB: ${err.message}`);
      }
    };

    const tempDir = path.join(process.cwd(), 'temp_downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let cookiesFilePath: string | null = null;

    try {
      logger.info(`[URL Download] Task ${taskId} started for URL: ${url}`);

      // ตรวจสอบคุกกี้สำหรับ x.com หรือ twitter.com
      if (url.includes('x.com') || url.includes('twitter.com')) {
        const config = await prisma.discordConfig.findFirst();
        if (config && config.twitterCookies) {
          cookiesFilePath = path.join(tempDir, `cookies_${taskId}.txt`);
          fs.writeFileSync(cookiesFilePath, config.twitterCookies, 'utf-8');
          logger.info(`Saved temporary cookies file for task ${taskId}`);
        }
      }

      // 1. ดึง Metadata ผ่าน yt-dlp -J
      updateTask({ status: 'fetching_info', name: 'กำลังดึงข้อมูลจากลิงก์...' });
      const metadataJson = await new Promise<string>((resolve, reject) => {
        const cookiesArg = cookiesFilePath ? `--cookies "${cookiesFilePath}"` : '';
        exec(`yt-dlp ${cookiesArg} -J "${url}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || err.message));
          } else {
            resolve(stdout);
          }
        });
      });

      const metadata = JSON.parse(metadataJson);
      const videoTitle = metadata.title || 'untitled_video';
      const fileExt = metadata.ext || 'mp4';
      const finalFileName = `${videoTitle}.${fileExt}`;
      const videoId = metadata.id || taskId;

      logger.info(`[URL Download] Task ${taskId} metadata fetched: "${videoTitle}" (ext: ${fileExt}, videoId: ${videoId})`);
      updateTask({ name: finalFileName, status: 'downloading', progress: 5 });

      // 2. สั่งดาวน์โหลดลงเครื่องผ่านช่อง temp
      const tempFilePath = path.join(tempDir, `${videoId}.${fileExt}`);

      const args = [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', tempFilePath,
      ];
      if (cookiesFilePath) {
        args.push('--cookies', cookiesFilePath);
      }
      args.push(url);

      const ytdl = spawn('yt-dlp', args);

      ytdl.stdout.on('data', (data) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+\.\d+)%/);
        if (progressMatch) {
          const progressPercent = parseFloat(progressMatch[1]);
          // แบ่งสัดส่วนความคืบหน้าดาวน์โหลดอยู่ที่ 5% ถึง 50%
          const overallProgress = Math.round(5 + (progressPercent / 100) * 45);
          updateTask({ progress: overallProgress });
        }
      });

      await new Promise<void>((resolve, reject) => {
        ytdl.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`yt-dlp สิ้นสุดด้วยโค้ดความผิดพลาด ${code}`));
          }
        });
      });

      // ตรวจหาไฟล์ผลลัพธ์ที่สมบูรณ์
      const filesInTemp = fs.readdirSync(tempDir);
      const completedFile = filesInTemp.find(f =>
        f.startsWith(videoId) &&
        !f.endsWith('.part') &&
        !f.endsWith('.ytdl') &&
        !f.endsWith('.temp')
      );

      if (!completedFile) {
        throw new Error('ไม่พบไฟล์ที่ดาวน์โหลดสำเร็จบนดิสก์หลังเสร็จสิ้นกระบวนการ');
      }
      const actualFilePath = path.join(tempDir, completedFile);
      const actualExt = path.extname(completedFile).substring(1) || 'mp4';
      const cleanFileName = videoTitle.endsWith(`.${actualExt}`) ? videoTitle : `${videoTitle}.${actualExt}`;

      // อัปเดตชื่อไฟล์ใน Task
      updateTask({ name: cleanFileName });

      const fileStats = fs.statSync(actualFilePath);
      const totalSize = fileStats.size;
      logger.info(`[URL Download] Task ${taskId} video downloaded to temp path: ${actualFilePath} (${totalSize} bytes)`);

      // 3. ทำภาพย่อ (Thumbnail) ผ่าน ffmpeg
      updateTask({ status: 'uploading_discord', progress: 50 });
      let thumbnailBase64: string | null = null;

      const tryGenerateThumbnail = async (args: string[]): Promise<Buffer> => {
        return new Promise<Buffer>((resolve, reject) => {
          const cmd = `ffmpeg ${args.join(' ')}`;
          exec(cmd, { encoding: 'buffer' }, (err, stdout) => {
            if (err) {
              reject(err);
            } else {
              resolve(stdout);
            }
          });
        });
      };

      try {
        let thumbBuffer: Buffer | null = null;
        try {
          // Attempt 1: software decoding seek to 1s
          thumbBuffer = await tryGenerateThumbnail([
            '-hwaccel', 'none',
            '-ss', '00:00:01',
            '-i', `"${actualFilePath}"`,
            '-vframes', '1',
            '-f', 'image2',
            '-'
          ]);
        } catch (err1) {
          try {
            // Attempt 2: seek to 0s
            thumbBuffer = await tryGenerateThumbnail([
              '-ss', '00:00:00',
              '-i', `"${actualFilePath}"`,
              '-vframes', '1',
              '-f', 'image2',
              '-'
            ]);
          } catch (err2) {
            // Attempt 3: no seeking
            thumbBuffer = await tryGenerateThumbnail([
              '-i', `"${actualFilePath}"`,
              '-vframes', '1',
              '-f', 'image2',
              '-'
            ]);
          }
        }
        if (thumbBuffer && thumbBuffer.length > 0) {
          thumbnailBase64 = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
        }
      } catch (thumbError) {
        logger.error('Failed to generate video thumbnail: ' + thumbError.message);
      }

      // 4. บันทึกประวัติไฟล์ลง Database
      const dbFile = await prisma.file.create({
        data: {
          name: cleanFileName,
          mimetype: actualExt === 'mp4' ? 'video/mp4' : (actualExt === 'webm' ? 'video/webm' : (actualExt === 'mkv' ? 'video/x-matroska' : (actualExt === 'mov' ? 'video/quicktime' : `video/${actualExt}`))),
          size: totalSize,
          folderId: folderId || null,
          userId,
        },
      });
      logger.info(`[URL Download] Task ${taskId} created database file record. File ID: ${dbFile.id}`);

      // 5. หั่นและส่งขึ้น Discord
      const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      const fd = fs.openSync(actualFilePath, 'r');

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const position = chunkIndex * CHUNK_SIZE;
          const length = Math.min(CHUNK_SIZE, totalSize - position);
          const buffer = Buffer.alloc(length);
          fs.readSync(fd, buffer, 0, length, position);

          const chunkFilename = `${dbFile.id}_chunk_${chunkIndex}`;
          
          // อัปโหลดขึ้น Discord ผ่านระบบ Queue ลำดับความสำคัญต่ำ
          const discordUpload = await this.discordQueueService.enqueue(
            () => this.discordService.uploadChunk(buffer, chunkFilename),
            'low'
          );

          const chunkRecord = await prisma.fileChunk.create({
            data: {
              fileId: dbFile.id,
              chunkIndex,
              size: length,
              discordMessageId: discordUpload.messageId,
              discordAttachmentId: discordUpload.attachmentId,
              discordChannelId: discordUpload.channelId,
              cdnUrl: discordUpload.cdnUrl,
              cdnExpiresAt: discordUpload.expiresAt,
            },
          });

          logger.info(`[URL Download] Task ${taskId} uploaded chunk ${chunkIndex + 1}/${totalChunks} (messageId: ${discordUpload.messageId}) and saved to DB (chunkId: ${chunkRecord.id})`);

          // อัปโหลดอยู่ระหว่าง 50% ถึง 95%
          const uploadProgress = Math.round(50 + ((chunkIndex + 1) / totalChunks) * 45);
          updateTask({ progress: uploadProgress });
        }
      } finally {
        fs.closeSync(fd);
      }

      // 6. อัปเดตบันทึกเสร็จสมบูรณ์พร้อมแนบรูปย่อ
      await prisma.file.update({
        where: { id: dbFile.id },
        data: {
          thumbnail: thumbnailBase64,
        },
      });

      logger.info(`[URL Download] Task ${taskId} upload complete. File finalized with thumbnail.`);
      updateTask({ status: 'completed', progress: 100 });

      // ลบไฟล์ตัวอย่างหลังอัปโหลดเสร็จสิ้น
      if (fs.existsSync(actualFilePath)) {
        fs.unlinkSync(actualFilePath);
      }
      logger.info(`[URL Download] Task ${taskId} finished successfully. Cleaned up temporary files.`);
    } catch (error: any) {
      logger.error('Background download task failed: ' + error.message);
      updateTask({ status: 'error', errorMessage: error.message || 'ดาวน์โหลดล้มเหลว' });
    }
  }

  async deleteUrlDownloadTask(id: string, userId: string) {
    try {
      const task = await prisma.urlDownloadTask.findFirst({
        where: { id, userId },
      });
      if (!task) {
        return RES.error(404, 'Task not found', 'ไม่พบงานที่ระบุ');
      }

      await prisma.urlDownloadTask.delete({
        where: { id },
      });
      return RES.ok(200, 'Task deleted successfully', 'ลบประวัติงานสำเร็จ', null);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async clearUrlDownloadTasks(userId: string) {
    try {
      await prisma.urlDownloadTask.deleteMany({
        where: {
          userId,
          status: { in: ['completed', 'error'] },
        },
      });
      return RES.ok(200, 'Tasks cleared successfully', 'ล้างประวัติงานทั้งหมดสำเร็จ', null);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }

  async retryUrlDownloadTask(id: string, userId: string) {
    try {
      const task = await prisma.urlDownloadTask.findFirst({
        where: { id, userId },
      });
      if (!task) {
        return RES.error(404, 'Task not found', 'ไม่พบงานที่ระบุ');
      }

      const updatedTask = await prisma.urlDownloadTask.update({
        where: { id },
        data: {
          status: 'fetching_info',
          progress: 0,
          errorMessage: null,
        },
      });

      // เริ่มรันใหม่ในเบื้องหลัง
      this.runBackgroundUrlDownload(updatedTask.id, updatedTask.url, updatedTask.folderId, userId);

      return RES.ok(200, 'Task retried successfully', 'เริ่มดาวน์โหลดใหม่อีกครั้งแล้ว', updatedTask);
    } catch (error) {
      logger.error(error);
      return RES.errorSystem();
    }
  }
}
