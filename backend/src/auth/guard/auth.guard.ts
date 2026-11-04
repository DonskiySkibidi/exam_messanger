import { UserService } from '@/user/user.service.js'
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
	public constructor(private readonly userService: UserService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest()

		if (typeof req.session.userId === 'undefined') {
			throw new UnauthorizedException(
				'Пользователь не авторизован. Войдите в систему, чтобы получить доступ.'
			)
		}
		
		const user = await this.userService.findById(req.session.userId)

		req.user = user

		return true
	}
}
