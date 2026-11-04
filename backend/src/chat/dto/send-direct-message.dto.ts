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

/**
 * Первое сообщение в DIRECT-диалоге: чата может ещё не существовать.
 * Сервис атомарно сделает get-or-create чата + сохранение сообщения.
 */
export class SendDirectMessageDto {
	@IsNotEmpty({ message: 'Id получателя не может быть пустым' })
	@IsString()
	public readonly recipientId!: string

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
}
