import { UpdateProfileDto } from './dto/update-profile.dto.js'
import { UserService } from './user.service.js'
import { Authorization } from '@/auth/decorators/auth.decorator.js'
import { Authorized } from '@/auth/decorators/authorized.decorato.js'
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Patch,
	Query,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'

@Controller('user')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Authorization()
	@Get('profile')
	@HttpCode(HttpStatus.OK)
	public async findProfile(@Authorized('id') userId: string) {
		// Санитизированный ответ: без password/accounts.
		return this.userService.findPublicById(userId)
	}

	/**
	 * PATCH /user/profile — только whitelist-поля.
	 * forbidNonWhitelisted: лишние role/email/password/id → 400.
	 */
	@Authorization()
	@Patch('profile')
	@HttpCode(HttpStatus.OK)
	@UsePipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true
		})
	)
	public async updateProfile(
		@Authorized('id') userId: string,
		@Body() dto: UpdateProfileDto
	) {
		return this.userService.updateProfile(userId, dto)
	}

	/** GET /user/search?q=&take= — исключает текущего, без паролей. */
	@Authorization()
	@Get('search')
	@HttpCode(HttpStatus.OK)
	public async searchUsers(
		@Authorized('id') userId: string,
		@Query('q') q = '',
		@Query('take') take?: string
	) {
		return this.userService.searchUsers(q, userId, take ? Number(take) : 20)
	}
}
