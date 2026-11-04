import { User } from '../../../prisma/__generated__/index.js'
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const Authorized = createParamDecorator(
	(data: keyof User, ctx: ExecutionContext) => {
		const req = ctx.switchToHttp().getRequest()
		const user = req.user

		return data ? user[data] : user
	}
)
