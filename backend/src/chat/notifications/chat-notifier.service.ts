import { ChatService } from '../chat.service.js'
import { ChatSessionRegistry } from '../presence/chat-session.registry.js'
import { Injectable, Logger } from '@nestjs/common'
import type { Server } from 'socket.io'

/** Единый контракт события `notifications` (дублируется на фронте в use-chats). */
export type NotificationPayload =
	| {
			kind: 'chat:preview'
			chatId: string
			lastMessage: unknown
			unreadCount: number
			updatedAt: unknown
	  }
	| { kind: 'chat:created'; chat: unknown; unreadCount: number }
	| { kind: 'chat:updated'; chat: unknown }
	| { kind: 'chat:removed'; chatId: string }
	| { kind: 'chat:read'; chatId: string; userId: string; lastReadAt: unknown }
	| { kind: 'presence'; userId: string; isOnline: boolean }

/**
 * Моментальные push-уведомления для сайдбара.
 * Вызывается из gateway И из REST-контроллера после каждой записи,
 * поэтому транспорт не важен: любой sendMessage ведёт сюда.
 * Отправка только тем, у кого есть живая сессия в реестре
 * (офлайновым слать нечего — они заберут состояние при загрузке).
 */
@Injectable()
export class ChatNotifier {
	private readonly logger = new Logger(ChatNotifier.name)
	private server: Server | null = null

	public constructor(
		private readonly chats: ChatService,
		private readonly sessions: ChatSessionRegistry
	) {}

	public bind(server: Server): void {
		this.server = server
	}

	/** Отправить конкретному пользователю, если он онлайн. */
	private emitTo(userId: string, payload: NotificationPayload): boolean {
		if (!this.server || !this.sessions.has(userId)) return false
		this.server
			.to(this.sessions.socketIds(userId))
			.emit('notifications', payload)
		return true
	}

	/** Новое сообщение: превью + персональный unreadCount каждому участнику. */
	public async notifyMessage(chatId: string, message: unknown): Promise<void> {
		try {
			const states = await this.chats.getChatReadStates(chatId)
			await Promise.all(
				states.map(async ({ userId, lastReadAt }) => {
					if (!this.sessions.has(userId)) return
					const unreadCount = await this.chats.countUnreadSince(
						userId,
						chatId,
						lastReadAt
					)
					this.emitTo(userId, {
						kind: 'chat:preview',
						chatId,
						lastMessage: message,
						unreadCount,
						updatedAt:
							(message as { createdAt?: unknown })?.createdAt ?? new Date()
					})
				})
			)
		} catch (error) {
			this.logger.error(`notifyMessage ${chatId} failed`, error as Error)
		}
	}

	/** Новый диалог/группа: вставить чат в топ сайдбара участников. */
	public async notifyChatCreated(chatId: string): Promise<void> {
		try {
			const [chat, states] = await Promise.all([
				this.chats.getChatById(chatId),
				this.chats.getChatReadStates(chatId)
			])
			await Promise.all(
				states.map(async ({ userId, lastReadAt }) => {
					if (!this.sessions.has(userId)) return
					const unreadCount = await this.chats.countUnreadSince(
						userId,
						chatId,
						lastReadAt
					)
					this.emitTo(userId, { kind: 'chat:created', chat, unreadCount })
				})
			)
		} catch (error) {
			this.logger.error(`notifyChatCreated ${chatId} failed`, error as Error)
		}
	}

	/** Инфо/состав чата изменились: разослать свежий объект участникам онлайн. */
	public async notifyChatUpdated(chatId: string): Promise<void> {
		try {
			const chat = await this.chats.getChatById(chatId)
			const states = await this.chats.getChatReadStates(chatId)
			for (const { userId } of states) {
				this.emitTo(userId, { kind: 'chat:updated', chat })
			}
		} catch (error) {
			this.logger.error(`notifyChatUpdated ${chatId} failed`, error as Error)
		}
	}

	/** Пользователь исключён/вышел/чат удалён: убрать чат из его сайдбара. */
	public notifyChatRemoved(userId: string, chatId: string): void {
		this.emitTo(userId, { kind: 'chat:removed', chatId })
	}

	/**
	 * Водяной знак прочтения продвинулся: разослать ОСТАЛЬНЫМ участникам
	 * чата (читатель уже обновился через ack), чтобы их футеры перевернули
	 * тики без перезагрузки. Только членам чата — посторонним знать
	 * о чужом прочтении не положено.
	 */
	public async notifyChatRead(
		chatId: string,
		readerId: string,
		lastReadAt: unknown
	): Promise<void> {
		try {
			const memberIds = await this.chats.getChatMemberIds(chatId)
			for (const userId of memberIds) {
				if (userId === readerId) continue
				this.emitTo(userId, {
					kind: 'chat:read',
					chatId,
					userId: readerId,
					lastReadAt
				})
			}
		} catch (error) {
			this.logger.error(`notifyChatRead ${chatId} failed`, error as Error)
		}
	}

	/** Presence широковещательно: фронт сам отфильтрует по своим чатам. */
	public notifyPresence(userId: string, isOnline: boolean): void {
		this.server?.emit('notifications', { kind: 'presence', userId, isOnline })
	}
}
