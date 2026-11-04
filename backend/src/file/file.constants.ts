import * as path from 'path'

/**
 * Единый источник правды для путей статики.
 * FileService и ServeStaticModule обязаны использовать одно и то же значение,
 * иначе файлы сохраняются в одну папку, а раздаются из другой
 * (был баг: `../.. /uploads` vs `__dirname/uploads`).
 */
export const UPLOAD_DIR: string = process.env['FILE_STORAGE_PATH']
	? path.resolve(process.env['FILE_STORAGE_PATH'])
	: path.resolve(process.cwd(), 'uploads')

/** Публичный префикс, должен совпадать с serveRoot в AppModule. */
export const PUBLIC_PREFIX = '/static'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB на файл
export const MAX_FILES_PER_REQUEST = 10

/** Белый список MIME → эталонное расширение. Всё остальное отклоняется. */
export const ALLOWED_MIME_TO_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
	'video/mp4': '.mp4',
	'video/webm': '.webm',
	'audio/mpeg': '.mp3',
	'audio/ogg': '.ogg',
	'audio/wav': '.wav',
	'application/pdf': '.pdf',
	'text/plain': '.txt'
}
