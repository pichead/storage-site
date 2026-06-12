-- AlterTable
ALTER TABLE `File` ADD COLUMN `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `shareExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `shareToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `File_shareToken_key` ON `File`(`shareToken`);
