import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { DiscordModule } from '../discord/discord.module';
import { CronRefreshService } from './cron-refresh.service';

@Module({
  imports: [DiscordModule],
  controllers: [StorageController],
  providers: [StorageService, CronRefreshService],
  exports: [StorageService],
})
export class StorageModule {}
