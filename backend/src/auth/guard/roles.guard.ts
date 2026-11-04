import { GlobalRole } from '../../../prisma/__generated__/index.js'
import { ROLES_KEY } from '../decorators/roles.decorator.js'
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class RolesGuard implements CanActivate {
	public constructor(private readonly reflector: Reflector) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const roles = this.reflector.getAllAndOverride<GlobalRole[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()]
		)
		const req = context.switchToHttp().getRequest()

		if (!roles) {
			return true
		}

		if (!roles.includes(req.user.role)) {
			throw new ForbiddenException('Недостаточно прав')
		}
		return true
	}
}
