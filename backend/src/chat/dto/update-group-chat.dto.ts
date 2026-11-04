import {
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	MinLength
} from 'class-validator'

/**
 * Редактирование GROUP-чата (как аккаунт: только name/description/imageUrl).
 * Все поля опциональны; пустой body отклоняется в сервисе (400).
 * DIRECT отклоняется в сервисе (400).
 */
export class UpdateGroupChatDto {
	@IsOptional()
	@IsString()
	@MinLength(1, { message: 'Название не может быть пустым' })
	@MaxLength(100, { message: 'Название не длиннее 100 символов' })
	public readonly name?: string

	@IsOptional()
	@IsString()
	@MaxLength(500, { message: 'Описание не длиннее 500 символов' })
	public readonly description?: string | null

	@IsOptional()
	@IsUrl(
		{ require_tld: false, require_protocol: true },
		{ message: 'Изображение должно быть валидным URL' }
	)
	@MaxLength(2048)
	public readonly imageUrl?: string | null
}
