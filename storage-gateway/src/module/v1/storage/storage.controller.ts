import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { JwtGuard } from 'src/common/guard/jwt.guard';
import { Response } from 'express';
import { RES } from 'src/utils';

@Controller('storage')
@UseGuards(JwtGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // ==========================================
  // FOLDERS ENDPOINTS (โฟลเดอร์)
  // ==========================================

  @Post('folders')
  createFolder(
    @Body('name') name: string,
    @Body('parentId') parentId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.createFolder(name, parentId, userId);
  }

  @Get('folders')
  listFolderContents(
    @Query('parentId') parentId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.listFolderContents(parentId, userId);
  }

  @Patch('folders/:id')
  renameFolder(
    @Param('id') id: string,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.renameFolder(id, name, userId);
  }

  @Patch('folders/:id/move')
  moveFolder(
    @Param('id') id: string,
    @Body('targetParentId') targetParentId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.moveFolder(id, targetParentId, userId);
  }

  @Delete('folders/:id')
  deleteFolder(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.storageService.deleteFolder(id, userId);
  }

  // ==========================================
  // UPLOADS ENDPOINTS (การอัปโหลดไฟล์)
  // ==========================================

  @Post('upload/initiate')
  initiateUpload(
    @Body('name') name: string,
    @Body('mimetype') mimetype: string,
    @Body('size') size: number,
    @Body('folderId') folderId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.initiateUpload(name, mimetype, size, folderId, userId);
  }

  @Post('upload/chunk')
  @UseInterceptors(FileInterceptor('file'))
  uploadChunk(
    @Query('fileId') fileId: string,
    @Query('chunkIndex') chunkIndex: string,
    @Query('size') size: string,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('ไม่พบข้อมูลชิ้นส่วนไฟล์แนบ');
    }
    const userId = req.user.id;
    const parsedChunkIndex = parseInt(chunkIndex, 10);
    const parsedSize = parseInt(size, 10);

    return this.storageService.uploadChunk(
      fileId,
      parsedChunkIndex,
      parsedSize,
      file.buffer,
      userId,
    );
  }

  @Post('upload/complete')
  completeUpload(
    @Body('fileId') fileId: string,
    @Body('thumbnail') thumbnail: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.completeUpload(fileId, thumbnail, userId);
  }

  // ==========================================
  // DOWNLOADS & DELETES ENDPOINTS (ดาวน์โหลด & ลบไฟล์)
  // ==========================================

  @Get('files/:id/download')
  downloadFile(
    @Param('id') id: string,
    @Query('preview') preview: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user.id;
    const isPreview = preview === 'true';
    return this.storageService.downloadFile(id, userId, req, res, isPreview);
  }

  @Patch('files/:id')
  renameFile(
    @Param('id') id: string,
    @Body('name') name: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.renameFile(id, name, userId);
  }

  @Patch('files/:id/move')
  moveFile(
    @Param('id') id: string,
    @Body('targetFolderId') targetFolderId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.moveFile(id, targetFolderId, userId);
  }

  @Delete('files/:id')
  deleteFile(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.storageService.deleteFile(id, userId);
  }

  // ==========================================
  // URL DOWNLOADER ENDPOINTS (ดาวน์โหลดผ่าน URL)
  // ==========================================

  @Post('url-download')
  startUrlDownload(
    @Body('url') url: string,
    @Body('folderId') folderId: string | null,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.storageService.startUrlDownload(url, folderId, userId);
  }

  @Get('url-download/tasks')
  getUrlDownloadTasks(@Req() req: any) {
    const userId = req.user.id;
    return this.storageService.getUrlDownloadTasks(userId);
  }

  @Delete('url-download/tasks/:id')
  deleteUrlDownloadTask(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.storageService.deleteUrlDownloadTask(id, userId);
  }

  @Delete('url-download/tasks')
  clearUrlDownloadTasks(@Req() req: any) {
    const userId = req.user.id;
    return this.storageService.clearUrlDownloadTasks(userId);
  }

  @Post('url-download/tasks/:id/retry')
  retryUrlDownloadTask(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.storageService.retryUrlDownloadTask(id, userId);
  }
}
