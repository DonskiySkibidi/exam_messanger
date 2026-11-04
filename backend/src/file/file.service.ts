import {
	ALLOWED_MIME_TO_EXT,
	MAX_FILE_SIZE
} from './file.constants.js'
import type {
	IStorageDriver,
	StoredFile
} from './storage/storage.interface.js'
import { STORAGE_DRIVER } from './storage/storage.interface.js'
import {
	BadRequestException,
	Inject,
	Injectable,
	PayloadTooLargeException
} from '@nestjs/common'
import * as path from 'path'

export type { StoredFile }

/**
 * Валидация (MIME/size) + санитизация имён. Само хранение —
 * за IStorageDriver (s3 по умолчанию, local как fallback).
 */
@Injectable()
export class FileService {
	public constructor(
		@Inject(STORAGE_DRIVER) private readonly storage: IStorageDriver
	) {}

	/** Пакетная загрузка; бросает 400/413 на невалидных файлах. */
	async uploadFiles(files: Array<Express.Multer.File>): Promise<StoredFile[]> {
		if (!files || files.length === 0) {
			throw new BadRequestException('Файлы не предоставлены')
		}
		const results: StoredFile[] = []
		for (const file of files) {
			results.push(await this.uploadFile(file))
		}
		return results
	}

	async uploadFile(file: Express.Multer.File): Promise<StoredFile> {
		this.validateFile(file)
		return this.storage.save({
			buffer: file.buffer,
			originalName: this.sanitizeFileName(file.originalname),
			mimeType: file.mimetype,
			size: file.size,
			extension: this.resolveExtension(file)
		})
	}

	// --------------------------------------------------

	private validateFile(file: Express.Multer.File): void {
		if (!file?.buffer || file.size === 0) {
			throw new BadRequestException(`Файл ${file?.originalname ?? ''} пуст`)
		}
		if (file.size > MAX_FILE_SIZE) {
			throw new PayloadTooLargeException(
				`Файл ${file.originalname} превышает ${MAX_FILE_SIZE / 1024 / 1024} MB`
			)
		}
		if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
			throw new BadRequestException(`MIME-тип ${file.mimetype} не разрешён`)
		}
	}

	/** Расширение строго из белого списка по MIME, не из имени файла. */
	private resolveExtension(file: Express.Multer.File): string {
		const mapped = ALLOWED_MIME_TO_EXT[file.mimetype]
		if (mapped) return mapped
		const rawExt = path.extname(file.originalname ?? '').toLowerCase()
		if (/^\.[a-z0-9]{1,10}$/.test(rawExt)) return rawExt
		return '.bin'
	}

	/** Чистим originalname для отображения: без путей, контрол-символов, разумная длина. */
	private sanitizeFileName(name: string): string {
		const base = path.basename(name ?? 'file').replace(/[\u0000-\u001f\u007f]/g, '')
		return base.slice(0, 255) || 'file'
	}
}
