import { ChatService } from './chat.service.js'
import { AddGroupMembersDto } from './dto/add-group-members.dto.js'
import { CreateGroupChatDto } from './dto/create-group-chat.dto.js'
import { MarkReadDto } from './dto/mark-read.dto.js'
import { SendDirectMessageDto } from './dto/send-direct-message.dto.js'
import { SendMessageDto } from './dto/send-message.dto.js'
import { UpdateGroupChatDto } from './dto/update-group-chat.dto.js'
import { Authorization } from '@/auth/decorators/auth.decorator.js'
import { ChatNotifier } from './notifications/chat-notifier.service.js'
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { GlobalRole } from '../../prisma/__generated__/index.js'
import type { Request } from 'express'

interface SessionRequest extends Request {
	session: Request['session'] & { userId: string }
	// AuthGuard кладёт полного юзера в req.user
	user?: { id: string }
}

function currentUserId(req: SessionRequest): string {
	return req.user?.id ?? req.session.userId
}

/**
 * REST-дубликат WS-методов: нужен фронтенду для истории, списка чатов
 * и для клиентов без сокетов. senderId всегда из сессии.
 * После каждой записи — тот же ChatNotifier, что у gateway,
 * поэтому транспорт не важен: сайдбар обновится мгновенно в обоих случаях.
 */
@Controller('chats')
export class ChatController {
	public constructor(
		private readonly chatService: ChatService,
		private readonly notifier: ChatNotifier
	) {}

	private currentUserId(req: SessionRequest): string {
		return currentUserId(req)
	}

	@Authorization()
	@Get()
	public getMyChats(@Req() req: SessionRequest) {
		return this.chatService.getUserChats(this.currentUserId(req))
	}

	@Authorization()
	@Get(':chatId/messages')
	public getMessages(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string,
		@Query('take') take?: string,
		@Query('cursor') cursor?: string
	) {
		return this.chatService.getChatMessages(
			this.currentUserId(req),
			chatId,
			take ? Number(take) : 75,
			cursor
		)
	}

	@Authorization()
	@Post('messages')
	@HttpCode(HttpStatus.CREATED)
	public async sendMessage(
		@Req() req: SessionRequest,
		@Body() dto: SendMessageDto
	) {
		const message = await this.chatService.saveMessage(
			this.currentUserId(req),
			dto
		)
		await this.notifier.notifyMessage(dto.chatId, message)
		return message
	}

	@Authorization()
	@Post('direct/messages')
	@HttpCode(HttpStatus.CREATED)
	public async sendDirectMessage(
		@Req() req: SessionRequest,
		@Body() dto: SendDirectMessageDto
	) {
		const result = await this.chatService.sendDirectMessage(
			this.currentUserId(req),
			dto
		)
		if (result.created) {
			await this.notifier.notifyChatCreated(result.chat.id)
		}
		await this.notifier.notifyMessage(result.chat.id, result.message)
		return result
	}

	@Authorization()
	@Post('direct/:recipientId')
	@HttpCode(HttpStatus.OK)
	public async getOrCreateDirect(
		@Req() req: SessionRequest,
		@Param('recipientId') recipientId: string
	) {
		const result = await this.chatService.getOrCreateDirectChat(
			this.currentUserId(req),
			recipientId
		)
		if (result.created) {
			await this.notifier.notifyChatCreated(result.chat.id)
		}
		return result
	}

	/**
	 * Создание GROUP-чата — только GlobalRole.ADMIN, иначе 403.
	 * forbidNonWhitelisted отсекает лишние поля.
	 */
	@Authorization(GlobalRole.ADMIN)
	@Post('group')
	@HttpCode(HttpStatus.CREATED)
	@UsePipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true
		})
	)
	public async createGroupChat(
		@Req() req: SessionRequest,
		@Body() dto: CreateGroupChatDto
	) {
		const result = await this.chatService.createGroupChat(
			this.currentUserId(req),
			dto
		)
		await this.notifier.notifyChatCreated(result.chat.id)
		return result
	}

	/**
	 * Отметка прочтения. Тело { upToMessageId? } — watermark до сообщения.
	 * Рассылка пирам — только при реальном продвижении знака.
	 */
	@Authorization()
	@Post(':chatId/read')
	@HttpCode(HttpStatus.OK)
	public async markRead(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string,
		@Body() dto: MarkReadDto
	) {
		const userId = this.currentUserId(req)
		const result = await this.chatService.markChatRead(
			userId,
			chatId,
			dto.upToMessageId
		)
		if (result.advanced) {
			await this.notifier.notifyChatRead(chatId, userId, result.lastReadAt)
		}
		return result
	}

	/**
	 * Редактирование информации GROUP-чата (название/описание/изображение).
	 * Право — chat ADMIN (проверка в сервисе). После — chat:updated участникам.
	 */
	@Authorization()
	@Patch(':chatId')
	@HttpCode(HttpStatus.OK)
	@UsePipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true
		})
	)
	public async updateGroupInfo(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string,
		@Body() dto: UpdateGroupChatDto
	) {
		const chat = await this.chatService.updateGroupInfo(
			this.currentUserId(req),
			chatId,
			dto
		)
		await this.notifier.notifyChatUpdated(chatId)
		return chat
	}

	/**
	 * Добавить участников в GROUP-чат (только chat ADMIN).
	 * Остальным — превью системного сообщения, добавленным — появление чата.
	 */
	@Authorization()
	@Post(':chatId/members')
	@HttpCode(HttpStatus.OK)
	@UsePipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true
		})
	)
	public async addMembers(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string,
		@Body() dto: AddGroupMembersDto
	) {
		const result = await this.chatService.addGroupMembers(
			this.currentUserId(req),
			chatId,
			dto
		)
		await this.notifier.notifyMessage(chatId, result.systemMessage)
		await this.notifier.notifyChatUpdated(chatId)
		return { addedIds: result.addedIds, chat: result.chat }
	}

	/**
	 * Исключить участника (только chat ADMIN, себя нельзя — только leave).
	 * Исключённому — chat:removed (чат исчезает из сайдбара).
	 */
	@Authorization()
	@Delete(':chatId/members/:userId')
	@HttpCode(HttpStatus.OK)
	public async removeMember(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string,
		@Param('userId') userId: string
	) {
		const actorId = this.currentUserId(req)
		const result = await this.chatService.removeGroupMember(
			actorId,
			chatId,
			userId
		)
		if (result.deleted) {
			this.notifier.notifyChatRemoved(actorId, chatId)
			return { deleted: true as const }
		}
		if (result.systemMessage) {
			await this.notifier.notifyMessage(chatId, result.systemMessage)
		}
		await this.notifier.notifyChatUpdated(chatId)
		this.notifier.notifyChatRemoved(result.removedId, chatId)
		return { deleted: false as const, chat: result.chat }
	}

	/** Выйти из GROUP-чата самому. Пустой чат удаляется каскадом. */
	@Authorization()
	@Post(':chatId/leave')
	@HttpCode(HttpStatus.OK)
	public async leaveChat(
		@Req() req: SessionRequest,
		@Param('chatId') chatId: string
	) {
		const userId = this.currentUserId(req)
		const result = await this.chatService.leaveGroupChat(userId, chatId)
		if (result.deleted) {
			this.notifier.notifyChatRemoved(userId, chatId)
			return { deleted: true as const }
		}
		if (result.systemMessage) {
			await this.notifier.notifyMessage(chatId, result.systemMessage)
		}
		await this.notifier.notifyChatUpdated(chatId)
		this.notifier.notifyChatRemoved(userId, chatId)
		return { deleted: false as const }
	}
}
