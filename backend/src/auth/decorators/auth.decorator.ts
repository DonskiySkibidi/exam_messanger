import { GlobalRole } from '../../../prisma/__generated__/index.js'
import { AuthGuard } from '../guard/auth.guard.js'
import { RolesGuard } from '../guard/roles.guard.js'
import { Roles } from './roles.decorator.js'
import { applyDecorators, UseGuards } from '@nestjs/common'

export function Authorization(...roles: GlobalRole[]) {
	if (roles.length > 0) {
		return applyDecorators(
			Roles(...roles),
			UseGuards(AuthGuard, RolesGuard)
		)
	}

	return applyDecorators(UseGuards(AuthGuard))
}
