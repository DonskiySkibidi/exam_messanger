import { Module } from '@nestjs/common';
import { UserModule } from '@/user/user.module.js';
import { FileService } from './file.service.js';
import { FileController } from './file.controller.js';
import { LocalStorageDriver } from './storage/local-storage.driver.js';
import { S3StorageDriver } from './storage/s3-storage.driver.js';
import { STORAGE_DRIVER } from './storage/storage.interface.js';

/**
 * Выбор драйвера через FILE_STORAGE_DRIVER: 's3' (MinIO, по умолчанию
 * в docker) или 'local' (диск backend/uploads).
 */
function buildStorageDriver() {
  return process.env['FILE_STORAGE_DRIVER'] === 'local'
    ? new LocalStorageDriver()
    : new S3StorageDriver();
}

@Module({
  imports: [UserModule],
  controllers: [FileController],
  providers: [
    LocalStorageDriver,
    S3StorageDriver,
    { provide: STORAGE_DRIVER, useFactory: buildStorageDriver },
    FileService,
  ],
})
export class FileModule {}
