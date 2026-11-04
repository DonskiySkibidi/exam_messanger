export interface SaveFileInput {
	buffer: Buffer
	originalName: string
	mimeType: string
	size: number
	extension: string
}

export interface StoredFile {
	/** Публичный URL вложения (absolute для s3, относительный /static/* для local). */
	url: string
	fileName: string
	fileSize: number
	mimeType: string
}

export interface IStorageDriver {
	save(input: SaveFileInput): Promise<StoredFile>
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER')
