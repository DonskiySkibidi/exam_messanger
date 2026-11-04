import { ChatController } from './chat.controller.js'
import { ChatGateway } from './chat.gateway.js'
import { ChatService } from './chat.service.js'
import { WsAuthGuard } from './guards/ws-auth.guard.js'
import { ChatNotifier } from './notifications/chat-notifier.service.js'
import { ChatSessionRegistry } from './presence/chat-session.registry.js'
import { UserModule } from '@/user/user.module.js'
import { Module } from '@nestjs/common'

@Module({
	imports: [UserModule],
	controllers: [ChatController],
	providers: [
		ChatGateway,
		ChatService,
		WsAuthGuard,
		ChatSessionRegistry,
		ChatNotifier
	]
})
export class ChatModule {}
