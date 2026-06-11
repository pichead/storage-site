import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordController } from './discord.controller';
import { DiscordQueueService } from './discord-queue.service';

@Module({
  controllers: [DiscordController],
  providers: [DiscordService, DiscordQueueService],
  exports: [DiscordService, DiscordQueueService],
})
export class DiscordModule {}
