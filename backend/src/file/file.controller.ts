import {
	ALLOWED_MIME_TO_EXT,
	MAX_FILE_SIZE,
	MAX_FILES_PER_REQUEST
} from './file.constants.js'
import { FileService } from './file.service.js'
import { Authorization } from '@/auth/decorators/auth.decorator.js'
import {
	BadRequestException,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UploadedFiles,
	UseInterceptors
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import type { Express } from 'express'
import { memoryStorage } from 'multer'

@Controller('file')
export class FileController {
	public constructor(private readonly fileService: FileService) {}

	/**
	 * POST /file/create (multipart/form-data, поле `files`).
	 * Multer держит файлы в памяти (memoryStorage) с лимитами;
	 * глубокая валидация MIME/размера — в FileService (единый источник).
	 * Возвращает массив { url, fileName, fileSize, mimeType },
	 * где url — публичный `/static/<file>` для вставки в сообщение.
	 */
	@Authorization()
	@UseInterceptors(
		FilesInterceptor('files', MAX_FILES_PER_REQUEST, {
			storage: memoryStorage(),
			limits: {
				files: MAX_FILES_PER_REQUEST,
				fileSize: MAX_FILE_SIZE
			},
			fileFilter: (_req, file, cb) => {
				if (ALLOWED_MIME_TO_EXT[file.mimetype]) {
					cb(null, true)
				} else {
					cb(
						new BadRequestException(
							`MIME-тип ${file.mimetype} не разрешён`
						) as unknown as Error,
						false
					)
				}
			}
		})
	)
	@Post('create')
	@HttpCode(HttpStatus.CREATED)
	public async uploadFiles(
		@UploadedFiles() files: Array<Express.Multer.File>
	) {
		return this.fileService.uploadFiles(files ?? [])
	}
}
