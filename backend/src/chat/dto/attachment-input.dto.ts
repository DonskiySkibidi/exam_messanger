import { IsInt, IsNotEmpty, IsString, Matches, Max, Min } from 'class-validator'

/**
 * Один аттачмент, уже сохранённый через FileModule.
 * `url` — публичный URL файла (абсолютный MinIO-URL или /static/* для local-драйвера).
 * Клиент обязан слать ТОЛЬКО эти 4 поля: лишние (напр. previewUrl) режутся
 * whitelist-валидацией gateway (forbidNonWhitelisted) → 400.
 */
export class AttachmentInputDto {
	@IsString()
	@IsNotEmpty()
	public readonly url!: string

	@IsString()
	@IsNotEmpty()
	public readonly fileName!: string

	@IsInt()
	@Min(1)
	@Max(50 * 1024 * 1024)
	public readonly fileSize!: number

	@IsString()
	@IsNotEmpty()
	@Matches(/^[a-z]+\/[a-z0-9.+-]+$/i, {
		message: 'mimeType должен быть вида type/subtype'
	})
	public readonly mimeType!: string
}
