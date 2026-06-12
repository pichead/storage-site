import { Controller, Get, Req, Res, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { StorageService } from './module/v1/storage/storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('storage/public/files/:id/download')
  async downloadPublicFile(
    @Param('id') id: string,
    @Query('token') token: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    return this.storageService.downloadPublicFile(id, token, req, res);
  }

  @Get('storage/public/files/:id/metadata')
  async getPublicFileMetadata(
    @Param('id') id: string,
    @Query('token') token: string,
  ) {
    return this.storageService.getPublicFileMetadata(id, token);
  }
}
