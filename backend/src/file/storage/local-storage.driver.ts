import { UPLOAD_DIR } from '../file.constants.js'
import type {
	IStorageDriver,
	SaveFileInput,
	StoredFile
} from './storage.interface.js'
import { PUBLIC_PREFIX } from '../file.constants.js'
import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	Logger
} from '@nestjs/common'
import { randomUUID } from 'crypto'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Локальный драйвер: диск (backend/uploads), раздача через ServeStatic /static.
 * Оставлен как fallback (FILE_STORAGE_DRIVER=local).
 */
@Injectable()
export class LocalStorageDriver implements IStorageDriver {
	private readonly logger = new Logger(LocalStorageDriver.name)

	async save(input: SaveFileInput): Promise<StoredFile> {
		try {
			await fs.mkdir(UPLOAD_DIR, { recursive: true })
		} catch (error) {
			this.logger.error(`Не удалось создать ${UPLOAD_DIR}`, error as Error)
			throw new InternalServerErrorException('Хранилище файлов недоступно')
		}

		let storedName = `${randomUUID()}-${Date.now()}${input.extension}`
		for (let attempt = 0; ; attempt++) {
			const absolutePath = this.safeJoin(UPLOAD_DIR, storedName)
			try {
				const handle = await fs.open(absolutePath, 'wx')
				try {
					await handle.writeFile(input.buffer)
				} finally {
					await handle.close()
				}
				return {
					url: `${PUBLIC_PREFIX}/${storedName}`,
					fileName: input.originalName,
					fileSize: input.size,
					mimeType: input.mimeType
				}
			} catch (error) {
				if ((error as NodeJS.ErrnoException)?.code === 'EEXIST' && attempt < 3) {
					storedName = `${randomUUID()}-${Date.now()}${input.extension}`
					continue
				}
				this.logger.error(`Ошибка записи ${storedName}`, error as Error)
				throw new InternalServerErrorException('Не удалось сохранить файл')
			}
		}
	}

	private safeJoin(base: string, fileName: string): string {
		const baseResolved = path.resolve(base)
		const target = path.resolve(baseResolved, path.basename(fileName))
		if (target !== baseResolved && !target.startsWith(baseResolved + path.sep)) {
			throw new BadRequestException('Недопустимое имя файла')
		}
		return target
	}
}
