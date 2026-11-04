import {
	ArrayMaxSize,
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	MinLength
} from 'class-validator'

export class CreateGroupChatDto {
	@IsString()
	@MinLength(1, { message: 'Название группы обязательно' })
	@MaxLength(100, { message: 'Название не длиннее 100 символов' })
	public readonly name!: string

	@IsOptional()
	@IsString()
	@MaxLength(500)
	public readonly description?: string

	// Та же причина, что в UpdateProfileDto.avatar: без require_tld: false
	// локальные URL (MinIO на localhost:9000) не проходят валидацию.
	@IsOptional()
	@IsUrl(
		{ require_tld: false, require_protocol: true },
		{ message: 'Аватар должен быть валидным URL' }
	)
	@MaxLength(2048)
	public readonly imageUrl?: string

	@IsArray()
	@ArrayMinSize(1, { message: 'Добавьте хотя бы одного участника' })
	@ArrayMaxSize(100, { message: 'Не более 100 участников' })
	@ArrayUnique({ message: 'ID участников не должны повторяться' })
	@IsString({ each: true })
	public readonly memberIds!: string[]
}
