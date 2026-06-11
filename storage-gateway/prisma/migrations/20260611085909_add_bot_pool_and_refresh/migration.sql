-- AlterTable
ALTER TABLE `File` ADD COLUMN `lastAccessedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `FileChunk` ADD COLUMN `discordChannelId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `DiscordAccountPool` (
    `id` VARCHAR(191) NOT NULL,
    `botToken` TEXT NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
