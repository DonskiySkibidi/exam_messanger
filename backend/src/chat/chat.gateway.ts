import { ChatService } from './chat.service.js'
import { CreateGroupChatDto } from './dto/create-group-chat.dto.js'
import { MarkReadDto } from './dto/mark-read.dto.js'
import { SendDirectMessageDto } from './dto/send-direct-message.dto.js'
import { SendMessageDto } from './dto/send-message.dto.js'
import { WsLoggingFilter } from './filters/ws-logging.filter.js'
import { WsAuthGuard } from './guards/ws-auth.guard.js'
import { ChatNotifier } from './notifications/chat-notifier.service.js'
import { ChatSessionRegistry } from './presence/chat-session.registry.js'
import { buildSessionMiddleware } from '@/libs/common/utils/session.util.js'
import { UserService } from '@/user/user.service.js'
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer
} from '@nestjs/websockets'
import { ConfigService } from '@nestjs/config'
import { UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

interface AuthenticatedSocket extends Socket {
	data: {
		user?: { id: string; name: string; image?: string | null; role?: string }
		userId?: string
		[key: string]: unknown
	}
}

/**
 * WS-слой — тонкий транспорт поверх ChatService.
 * Сессии: ChatSessionRegistry (userId → Set<socketId>).
 * Сайдбар-уведомления: ChatNotifier → событие `notifications`
 * (тред сообщений идёт отдельным `newMessage`).
 */
@WebSocketGateway({ cors: { origin: process.env['ALLOWED_ORIGIN'], credentials: true } })
@UseFilters(WsLoggingFilter)
@UsePipes(
	new ValidationPipe({
		transform: true,
		whitelist: true,
		forbidNonWhitelisted: true
	})
)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	public server!: Server

	public constructor(
		private readonly chatService: ChatService,
		private readonly userService: UserService,
		private readonly sessions: ChatSessionRegistry,
		private readonly notifier: ChatNotifier,
		private readonly configService: ConfigService
	) {}

	/** Прокидываем express-session в socket.io engine, иначе guard не увидит session. */
	public afterInit(server: Server): void {
		const sessionMiddleware = buildSessionMiddleware(this.configService)
		// socket.io engine.use понимает express-middleware (req, res, next)
		server.engine.use(sessionMiddleware as never)
		this.notifier.bind(server)
	}

	public async handleConnection(client: AuthenticatedSocket): Promise<void> {
		const sessionUserId = (client.request as { session?: { userId?: string } })
			?.session?.userId
		if (!sessionUserId) return

		client.data.userId = sessionUserId
		await client.join(`user:${sessionUserId}`)

		// online — только первая сессия пользователя.
		if (this.sessions.add(sessionUserId, client.id) === 1) {
			await this.userService.setOnlineStatus(sessionUserId, true)
			this.notifier.notifyPresence(sessionUserId, true)
		}
	}

	public async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
		const userId = client.data.userId
		if (!userId) return

		await client.leave(`user:${userId}`)
		// offline — только когда закрылась последняя сессия.
		if (this.sessions.remove(userId, client.id) === 0) {
			await this.userService.setOnlineStatus(userId, false)
			this.notifier.notifyPresence(userId, false)
		}
	}

	@UseGuards(WsAuthGuard)
	@SubscribeMessage('joinRoom')
	public async handleJoinRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: { chatId: string }
	): Promise<{ chatId: string }> {
		await client.join(payload.chatId)
		return { chatId: payload.chatId }
	}

	@UseGuards(WsAuthGuard)
	@SubscribeMessage('leaveRoom')
	public async handleLeaveRoom(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: { chatId: string }
	): Promise<{ chatId: string }> {
		await client.leave(payload.chatId)
		return { chatId: payload.chatId }
	}

	/** Отправка в существующий чат. senderId берётся из сессии, не из payload. */
	@UseGuards(WsAuthGuard)
	@SubscribeMessage('sendMessage')
	public async handleSendMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: SendMessageDto
	) {
		const senderId = client.data.userId as string
		const message = await this.chatService.saveMessage(senderId, payload)
		this.server.to(payload.chatId).emit('newMessage', message)
		await this.notifier.notifyMessage(payload.chatId, message)
		return message
	}

	/**
	 * Первое сообщение незнакомому пользователю.
	 * Создаёт DIRECT-чат атомарно (или переиспользует существующий).
	 */
	@UseGuards(WsAuthGuard)
	@SubscribeMessage('sendDirectMessage')
	public async handleSendDirectMessage(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: SendDirectMessageDto
	) {
		const senderId = client.data.userId as string
		const { message, chat, created } =
			await this.chatService.sendDirectMessage(senderId, payload)

		await client.join(chat.id)
		this.server.to(chat.id).emit('newMessage', message)
		if (created) {
			await this.notifier.notifyChatCreated(chat.id)
		}
		await this.notifier.notifyMessage(chat.id, message)
		return { message, chat, created }
	}

	/**
	 * Создание GROUP-чата по WS. RBAC проверяется в сервисе
	 * (403 для не-ADMIN), дублируя @Authorization(ADMIN) REST-контроллера.
	 */
	@UseGuards(WsAuthGuard)
	@SubscribeMessage('createGroupChat')
	public async handleCreateGroupChat(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: CreateGroupChatDto
	) {
		const senderId = client.data.userId as string
		const { chat } = await this.chatService.createGroupChat(senderId, payload)
		await client.join(chat.id)
		await this.notifier.notifyChatCreated(chat.id)
		return chat
	}

	/**
	 * Отметка прочтения по видимости (батч: watermark до upToMessageId).
	 * Рассылка пирам — только если знак реально продвинулся.
	 */
	@UseGuards(WsAuthGuard)
	@SubscribeMessage('markRead')
	public async handleMarkRead(
		@ConnectedSocket() client: AuthenticatedSocket,
		@MessageBody() payload: { chatId: string } & MarkReadDto
	) {
		const userId = client.data.userId as string
		const result = await this.chatService.markChatRead(
			userId,
			payload.chatId,
			payload.upToMessageId
		)
		if (result.advanced) {
			await this.notifier.notifyChatRead(
				payload.chatId,
				userId,
				result.lastReadAt
			)
		}
		return result
	}
}
