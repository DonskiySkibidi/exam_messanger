import { AttachmentInputDto } from './attachment-input.dto.js'
import { Type } from 'class-transformer'
import {
	ArrayMaxSize,
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsString,
	MaxLength,
	ValidateNested
} from 'class-validator'

export class SendMessageDto {
	@IsNotEmpty({ message: 'Id чата не может быть пустым' })
	@IsString()
	public readonly chatId!: string

	@IsOptional()
	@IsString()
	@MaxLength(4000, { message: 'Сообщение не длиннее 4000 символов' })
	public readonly content?: string

	@IsOptional()
	@IsArray()
	@ArrayMaxSize(10, { message: 'Не более 10 вложений' })
	@ValidateNested({ each: true })
	@Type(() => AttachmentInputDto)
	public readonly attachments?: AttachmentInputDto[]

	/**
	 * senderId НЕ принимается от клиента.
	 * Отправитель извлекается из сессии / socket.data.userId на gateway/controller.
	 */
}
