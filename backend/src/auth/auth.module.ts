import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { UserService } from '@/user/user.service.js'
import { Module } from '@nestjs/common'

@Module({
	controllers: [AuthController],
	providers: [AuthService, UserService]
})
export class AuthModule {}
