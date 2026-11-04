import { UserService } from '@/user/user.service.js'
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException
} from '@nestjs/common'
import type { Socket } from 'socket.io'

interface SessionSocket extends Socket {
	request: Socket['request'] & {
		session?: { userId?: string }
	}
}

/**
 * WS-аналог HTTP AuthGuard.
 * senderId больше НЕ берётся из payload — только из сессии.
 * Требует, чтобы express-session был прокинут в socket.io engine
 * (см. ChatGateway.afterInit).
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
	public constructor(private readonly userService: UserService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const client = context.switchToWs().getClient<SessionSocket>()
		const sessionUserId = client.request?.session?.userId ?? client.data?.userId

		if (!sessionUserId) {
			throw new UnauthorizedException(
				'Пользователь не авторизован. Подключитесь с валидной сессией.'
			)
		}

		const user = await this.userService.findById(sessionUserId).catch(() => null)
		if (!user) {
			throw new UnauthorizedException('Пользователь не найден')
		}

		client.data.user = user
		client.data.userId = user.id

		return true
	}
}
