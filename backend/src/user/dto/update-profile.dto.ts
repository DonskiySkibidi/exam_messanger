import { Department } from '../../../prisma/__generated__/index.js'
import {
	IsEnum,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	MinLength
} from 'class-validator'

/**
 * Whitelist полей профиля. ValidationPipe с whitelist:true +
 * forbidNonWhitelisted:true на контроллере превратит любые
 * role/email/password/id в 400. Здесь только разрешённые поля.
 * `avatar` маппится на `User.image` в сервисе.
 */
export class UpdateProfileDto {
	@IsOptional()
	@IsString()
	@MinLength(2, { message: 'Имя не короче 2 символов' })
	@MaxLength(50, { message: 'Имя не длиннее 50 символов' })
	public readonly name?: string

	// require_tld: false — иначе режутся локальные хосты без точки
	// (http://localhost:9000/... из MinIO). Протокол обязателен.
	@IsOptional()
	@IsUrl(
		{ require_tld: false, require_protocol: true },
		{ message: 'Аватар должен быть валидным URL' }
	)
	@MaxLength(2048)
	public readonly avatar?: string

	@IsOptional()
	@IsString()
	@MaxLength(500, { message: 'Описание не длиннее 500 символов' })
	public readonly bio?: string

	@IsOptional()
	@IsEnum(Department, { message: 'Некорректный департамент' })
	public readonly department?: Department
}
