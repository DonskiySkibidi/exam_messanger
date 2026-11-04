import { GlobalRole } from '../../../prisma/__generated__/index.js'
import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

export const Roles = (...roles: GlobalRole[]) => SetMetadata(ROLES_KEY, roles)
