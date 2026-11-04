import { IsOptional, IsString } from 'class-validator'

/**
 * Отметка прочтения с точностью до сообщения.
 * Без upToMessageId — классика (watermark = now), с ним — монотонное
 * продвижение до createdAt указанного сообщения. Повтор идемпотентен.
 */
export class MarkReadDto {
	@IsOptional()
	@IsString()
	public readonly upToMessageId?: string
}
