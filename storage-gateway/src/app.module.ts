import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './module/v1/admin/admin.module';
import { AuthModule } from './module/v1/auth/auth.module';
import { TestModule } from './module/v1/test/test.module';
import { StorageModule } from './module/v1/storage/storage.module';
import { DiscordModule } from './module/v1/discord/discord.module';
import { DashboardModule } from './module/v1/dashboard/dashboard.module';


@Module({
  imports: [AdminModule, AuthModule, TestModule, StorageModule, DiscordModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
