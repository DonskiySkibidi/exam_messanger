import { AddGroupMembersDto } from './dto/add-group-members.dto.js'
import { CreateGroupChatDto } from './dto/create-group-chat.dto.js'
import { SendDirectMessageDto } from './dto/send-direct-message.dto.js'
import { SendMessageDto } from './dto/send-message.dto.js'
import { UpdateGroupChatDto } from './dto/update-group-chat.dto.js'
import type { AttachmentInputDto } from './dto/attachment-input.dto.js'
import { PrismaService } from '@/prisma/prisma.service.js'
import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { Prisma } from '../../prisma/__generated__/index.js'

const MESSAGE_INCLUDE = {
	sender: { select: { id: true, name: true, image: true } },
	attachments: true
} as const

const CHAT_WITH_MEMBERS = {
	members: {
		include: {
			user: {
				// Профиль участника для UserProfileDialog: без bio/department/email
				// клиент маппил их в null (toProfileUser).
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					bio: true,
					department: true,
					isOnline: true
				}
			}
		}
	}
} as const

/** Подмножество клиента транзакции, нужное хелперам управления группой. */
type GroupTx = {
	chat: PrismaService['chat']
	chatMember: PrismaService['chatMember']
	message: PrismaService['message']
	user: PrismaService['user']
}

@Injectable()
export class ChatService {
	public constructor(private readonly prisma: PrismaService) {}

	// --------------------------------------------------
	// Helpers
	// --------------------------------------------------

	/** Детерминированный ключ пары. Порядок не важен: min:max. */
	public static buildDirectKey(a: string, b: string): string {
		return a < b ? `${a}:${b}` : `${b}:${a}`
	}

	private assertNonEmpty(
		content: string | undefined,
		attachments: AttachmentInputDto[] | undefined
	): string | null {
		const text = content?.trim() ?? ''
		if (!text && (!attachments || attachments.length === 0)) {
			throw new BadRequestException('Сообщение не может быть пустым')
		}
		if (text.length > 4000) {
			throw new BadRequestException(
				'Сообщение не должно превышать 4000 символов'
			)
		}
		return text.length > 0 ? text : null
	}

	private isUniqueViolation(error: unknown): boolean {
		return (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		)
	}

	// --------------------------------------------------
	// DIRECT: get-or-create + первое сообщение (атомарно, race-safe)
	// --------------------------------------------------

	/**
	 * Отправка сообщения в DIRECT-диалог.
	 *
	 * Flow:
	 * 1. fast-path: поиск чата по `directKey` (O(1), unique index).
	 * 2. если найден → обычное сохранение через saveMessage().
	 * 3. если нет → одна транзакция: create chat + 2 members + message + lastMessage.
	 * 4. при конкурентном создании вторая транзакция ловит P2002
	 *    и делает один retry уже по существующему чату.
	 *
	 * @returns { message, chat, created } — `created=true`, если чат создан сейчас.
	 */
	async sendDirectMessage(
		senderId: string,
		dto: SendDirectMessageDto
	): Promise<{ message: any; chat: any; created: boolean }> {
		const recipientId = dto.recipientId?.trim()
		if (!recipientId) {
			throw new BadRequestException('recipientId обязателен')
		}
		if (recipientId === senderId) {
			throw new BadRequestException(
				'Нельзя создать DIRECT-диалог с самим собой'
			)
		}
		const text = this.assertNonEmpty(dto.content, dto.attachments)

		// Проверяем существование обоих пользователей одним запросом,
		// чтобы не плодить два round-trip и дать понятную 404.
		const users = await this.prisma.user.findMany({
			where: { id: { in: [senderId, recipientId] } },
			select: { id: true }
		})
		if (users.length !== 2) {
			throw new NotFoundException('Собеседник не найден')
		}

		const directKey = ChatService.buildDirectKey(senderId, recipientId)

		// Fast path без транзакции: чат уже существует (99% случаев).
		const existing = await this.prisma.chat.findUnique({
			where: { directKey },
			select: { id: true }
		})
		if (existing) {
			const message = await this.saveMessage(senderId, {
				chatId: existing.id,
				content: dto.content,
				attachments: dto.attachments
			})
			const chat = await this.prisma.chat.findUniqueOrThrow({
				where: { id: existing.id },
				include: CHAT_WITH_MEMBERS
			})
			return { message, chat, created: false }
		}

		// Slow path: атомарное создание всего треда в одной транзакции.
		try {
			const result = await this.prisma.$transaction(async tx => {
				const chat = await tx.chat.create({
					data: {
						type: 'DIRECT',
						directKey,
						members: {
							create: [{ userId: senderId }, { userId: recipientId }]
						}
					},
					include: CHAT_WITH_MEMBERS
				})

				const message = await tx.message.create({
					data: {
						chatId: chat.id,
						senderId,
						content: text,
						attachments: dto.attachments?.length
							? {
									create: dto.attachments.map(f => ({
										url: f.url,
										fileName: f.fileName,
										fileSize: f.fileSize,
										mimeType: f.mimeType,
										uploaderId: senderId
									}))
								}
							: undefined
					},
					include: MESSAGE_INCLUDE
				})

				await tx.chat.update({
					where: { id: chat.id },
					data: { lastMessageId: message.id }
				})

				return { message, chat, created: true as const }
			})
			return result
		} catch (error) {
			// Race: параллельная транзакция уже создала чат с тем же directKey.
			// Повторно создавать нельзя — пишем сообщение в существующий тред.
			if (!this.isUniqueViolation(error)) throw error

			const winner = await this.prisma.chat.findUnique({
				where: { directKey },
				select: { id: true }
			})
			if (!winner) throw error // крайне маловероятно, пробрасываем оригинал

			const message = await this.saveMessage(senderId, {
				chatId: winner.id,
				content: dto.content,
				attachments: dto.attachments
			})
			const chat = await this.prisma.chat.findUniqueOrThrow({
				where: { id: winner.id },
				include: CHAT_WITH_MEMBERS
			})
			return { message, chat, created: false }
		}
	}

	/** Явное создание (или возврат существующего) DIRECT-чата без сообщения. */
	async getOrCreateDirectChat(senderId: string, recipientId: string) {
		if (!recipientId?.trim()) {
			throw new BadRequestException('recipientId обязателен')
		}
		if (recipientId === senderId) {
			throw new BadRequestException(
				'Нельзя создать DIRECT-диалог с самим собой'
			)
		}
		const directKey = ChatService.buildDirectKey(senderId, recipientId)

		const existing = await this.prisma.chat.findUnique({
			where: { directKey },
			include: CHAT_WITH_MEMBERS
		})
		if (existing) return { chat: existing, created: false as const }

		try {
			const chat = await this.prisma.chat.create({
				data: {
					type: 'DIRECT',
					directKey,
					members: {
						create: [{ userId: senderId }, { userId: recipientId }]
					}
				},
				include: CHAT_WITH_MEMBERS
			})
			return { chat, created: true as const }
		} catch (error) {
			if (!this.isUniqueViolation(error)) throw error
			const winner = await this.prisma.chat.findUniqueOrThrow({
				where: { directKey },
				include: CHAT_WITH_MEMBERS
			})
			return { chat: winner, created: false as const }
		}
	}

	// --------------------------------------------------
	// GROUP: создание (RBAC ADMIN only, одна транзакция)
	// --------------------------------------------------

	/**
	 * Создание группового чата. Только GlobalRole.ADMIN.
	 * Проверка роли дублируется в сервисе (defense in depth для WS-пути),
	 * контроллер дополнительно закрыт @Authorization(GlobalRole.ADMIN).
	 * Все связи создаются в одной транзакции.
	 */
	async createGroupChat(creatorId: string, dto: CreateGroupChatDto) {
		const creator = await this.prisma.user.findUnique({
			where: { id: creatorId },
			select: { id: true, role: true }
		})
		if (!creator) throw new NotFoundException('Пользователь не найден')
		if (creator.role !== 'ADMIN') {
			throw new ForbiddenException(
				'Создание групповых чатов доступно только администраторам'
			)
		}

		const name = dto.name?.trim()
		if (!name) throw new BadRequestException('Название группы обязательно')

		const uniqueMemberIds = [...new Set(dto.memberIds.map(id => id.trim()))]
			.filter(id => id.length > 0 && id !== creatorId)
		if (uniqueMemberIds.length < 1) {
			throw new BadRequestException('Добавьте хотя бы одного участника')
		}
		if (uniqueMemberIds.length > 100) {
			throw new BadRequestException('Не более 100 участников')
		}

		const found = await this.prisma.user.findMany({
			where: { id: { in: uniqueMemberIds } },
			select: { id: true }
		})
		if (found.length !== uniqueMemberIds.length) {
			const foundSet = new Set(found.map(u => u.id))
			const missing = uniqueMemberIds.filter(id => !foundSet.has(id))
			throw new NotFoundException(
				`Пользователи не найдены: ${missing.slice(0, 5).join(', ')}`
			)
		}

		return this.prisma.$transaction(async tx => {
			const chat = await tx.chat.create({
				data: {
					type: 'GROUP',
					directKey: null,
					name,
					description: dto.description?.trim() || null,
					imageUrl: dto.imageUrl ?? null,
					members: {
						create: [
							{ userId: creatorId, role: 'ADMIN' },
							...uniqueMemberIds.map(userId => ({
								userId,
								role: 'MEMBER' as const
							}))
						]
					}
				},
				include: CHAT_WITH_MEMBERS
			})
			return { chat, created: true as const }
		})
	}

	async getChatMemberIds(chatId: string): Promise<string[]> {
		const members = await this.prisma.chatMember.findMany({
			where: { chatId },
			select: { userId: true }
		})
		return members.map(m => m.userId)
	}

	/**
	 * Отметка прочтения по водяному знаку lastReadAt.
	 * - Без upToMessageId: watermark = now (открытие чата).
	 * - С upToMessageId: watermark = max(текущий, createdAt сообщения).
	 * Сообщение обязано принадлежать этому чату, иначе 400 — клиентскому
	 * утверждению о прочтении без проверки не доверяем.
	 * Возвращает advanced=false при повторе (идемпотентно): рассылать
	 * событие пирам в этом случае не нужно.
	 */
	async markChatRead(userId: string, chatId: string, upToMessageId?: string) {
		const membership = await this.prisma.chatMember.findUnique({
			where: { userId_chatId: { userId, chatId } },
			select: { id: true, lastReadAt: true }
		})
		if (!membership) {
			throw new ForbiddenException('Вы не являетесь участником этого чата')
		}

		let watermark = new Date()
		if (upToMessageId) {
			const message = await this.prisma.message.findUnique({
				where: { id: upToMessageId },
				select: { chatId: true, createdAt: true }
			})
			if (!message) {
				throw new NotFoundException('Сообщение не найдено')
			}
			if (message.chatId !== chatId) {
				throw new BadRequestException(
					'Сообщение не принадлежит этому чату'
				)
			}
			watermark =
				message.createdAt > membership.lastReadAt
					? message.createdAt
					: membership.lastReadAt
		}

		// Повтор/откат: водяной знак уже впереди — состояние не меняем.
		if (watermark.getTime() === membership.lastReadAt.getTime()) {
			const unreadCount = await this.countUnreadSince(
				userId,
				chatId,
				membership.lastReadAt
			)
			return {
				lastReadAt: membership.lastReadAt,
				advanced: false as const,
				unreadCount
			}
		}

		const updated = await this.prisma.chatMember.update({
			where: { userId_chatId: { userId, chatId } },
			data: { lastReadAt: watermark },
			select: { lastReadAt: true }
		})
		const unreadCount = await this.countUnreadSince(
			userId,
			chatId,
			updated.lastReadAt
		)
		return {
			lastReadAt: updated.lastReadAt,
			advanced: true as const,
			unreadCount
		}
	}

	// --------------------------------------------------
	// Данные для нотифаера (один запрос на всех участников)
	// --------------------------------------------------

	/** userId + lastReadAt всех участников чата (для персональных unread). */
	async getChatReadStates(
		chatId: string
	): Promise<Array<{ userId: string; lastReadAt: Date }>> {
		return this.prisma.chatMember.findMany({
			where: { chatId },
			select: { userId: true, lastReadAt: true }
		})
	}

	/** Число чужих сообщений чата после метки прочтения. */
	async countUnreadSince(
		userId: string,
		chatId: string,
		since: Date
	): Promise<number> {
		return this.prisma.message.count({
			where: {
				chatId,
				senderId: { not: userId },
				createdAt: { gt: since }
			}
		})
	}

	/** Полный чат для события chat:created (с участниками и lastMessage). */
	async getChatById(chatId: string) {
		return this.prisma.chat.findUniqueOrThrow({
			where: { id: chatId },
			include: {
				...CHAT_WITH_MEMBERS,
				lastMessage: {
					include: {
						sender: { select: { id: true, name: true, image: true } }
					}
				}
			}
		})
	}

	// --------------------------------------------------
	// Обычная отправка в существующий чат
	// --------------------------------------------------

	/**
	 * Сохранение сообщения в существующий чат.
	 * Проверяет членство отправителя, обновляет lastMessageId в той же транзакции.
	 */
	async saveMessage(senderId: string, dto: SendMessageDto) {
		const text = this.assertNonEmpty(dto.content, dto.attachments)

		return this.prisma.$transaction(async tx => {
			const membership = await tx.chatMember.findUnique({
				where: { userId_chatId: { userId: senderId, chatId: dto.chatId } },
				select: { id: true }
			})
			if (!membership) {
				throw new ForbiddenException(
					'Вы не являетесь участником этого чата'
				)
			}

			const message = await tx.message.create({
				data: {
					chatId: dto.chatId,
					senderId,
					content: text,
					attachments: dto.attachments?.length
						? {
								create: dto.attachments.map(f => ({
									url: f.url,
									fileName: f.fileName,
									fileSize: f.fileSize,
									mimeType: f.mimeType,
									uploaderId: senderId
								}))
							}
						: undefined
				},
				include: MESSAGE_INCLUDE
			})

			await tx.chat.update({
				where: { id: dto.chatId },
				data: { lastMessageId: message.id }
			})

			return message
		}).catch((error: unknown) => {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2025'
			) {
				throw new NotFoundException('Чат не найден')
			}
			throw error
		})
	}

	// --------------------------------------------------
	// Чтение
	// --------------------------------------------------

	async getUserChats(userId: string) {
		const chats = await this.prisma.chat.findMany({
			where: { members: { some: { userId } } },
			include: {
				...CHAT_WITH_MEMBERS,
				lastMessage: {
					include: {
						sender: {
							select: { id: true, name: true, image: true }
						}
					}
				}
			},
			orderBy: { updatedAt: 'desc' }
		})

		// Бейджи непрочитанных: свои lastReadAt + чужие сообщения после него.
		const memberships = await this.prisma.chatMember.findMany({
			where: { userId, chatId: { in: chats.map(c => c.id) } },
			select: { chatId: true, lastReadAt: true }
		})
		const readMap = new Map(memberships.map(m => [m.chatId, m.lastReadAt]))

		const unreadCounts = await Promise.all(
			chats.map(chat =>
				this.prisma.message.count({
					where: {
						chatId: chat.id,
						senderId: { not: userId },
						createdAt: { gt: readMap.get(chat.id) ?? new Date(0) }
					}
				})
			)
		)

		return chats.map((chat, i) => ({
			...chat,
			unreadCount: unreadCounts[i] ?? 0
		}))
	}

	async getChatMessages(
		userId: string,
		chatId: string,
		take = 75,
		cursor?: string
	) {
		const membership = await this.prisma.chatMember.findUnique({
			where: { userId_chatId: { userId, chatId } },
			select: { id: true }
		})
		if (!membership) {
			throw new ForbiddenException(
				'Вы не являетесь участником этого чата'
			)
		}
		if (take < 1 || take > 100) {
			throw new BadRequestException('take должен быть от 1 до 100')
		}

		return this.prisma.message.findMany({
			where: { chatId },
			include: MESSAGE_INCLUDE,
			orderBy: { createdAt: 'desc' },
			take,
			...(cursor
				? { cursor: { id: cursor }, skip: 1 }
				: undefined)
		})
	}

	// --------------------------------------------------
	// GROUP management: info / add / remove / leave (chat ADMIN)
	// --------------------------------------------------
	// Модель членства — жёсткое удаление строки ChatMember, а НЕ флаг
	// haveAccess. Причины (fail-closed вместо fail-open):
	// 1. Все существующие проверки (findUnique userId_chatId в saveMessage,
	//    getChatMessages, markChatRead; members.some в getUserChats) после
	//    удаления автоматически закрывают доступ — ни одного нового фильтра
	//    запоминать не надо. С флагом достаточно забыть `haveAccess: true`
	//    в одном будущем эндпоинте — и кикнутый увидит чужие данные.
	// 2. Повторное добавление = свежая строка со свежим lastReadAt
	//    (без взрыва бейджей), @@unique исключает дубли.
	// 3. Аудит сохраняется лучше: системное сообщение в треде фиксирует
	//    кто/кого/когда, а флаг в строке — нет.
	// Известный компромисс (одинаков для обоих подходов): вернувшийся
	// участник видит сообщения, отправленные в его отсутствие, — для
	// поперсональной видимости нужны интервалы членства, здесь избыточно.

	/** Загрузить GROUP-чат или бросить 404/400 (для DIRECT). */
	private async requireGroupChat(tx: GroupTx, chatId: string) {
		const chat = await tx.chat.findUnique({
			where: { id: chatId },
			select: { id: true, type: true }
		})
		if (!chat) throw new NotFoundException('Чат не найден')
		if (chat.type !== 'GROUP') {
			throw new BadRequestException(
				'Управление участниками доступно только в групповых чатах'
			)
		}
		return chat
	}

	/** Активное членство с ролью ADMIN чата, иначе 403. */
	private async requireChatAdmin(tx: GroupTx, userId: string, chatId: string) {
		const membership = await tx.chatMember.findUnique({
			where: { userId_chatId: { userId, chatId } },
			select: { id: true, role: true }
		})
		if (!membership) {
			throw new ForbiddenException('Вы не являетесь участником этого чата')
		}
		if (membership.role !== 'ADMIN') {
			throw new ForbiddenException(
				'Управление группой доступно только администраторам чата'
			)
		}
		return membership
	}

	/** Системное событие в тред + обновление lastMessageId. */
	private async pushSystemMessage(
		tx: GroupTx,
		chatId: string,
		senderId: string,
		text: string
	) {
		const message = await tx.message.create({
			data: { chatId, senderId, content: text, kind: 'SYSTEM' },
			include: MESSAGE_INCLUDE
		})
		await tx.chat.update({
			where: { id: chatId },
			data: { lastMessageId: message.id }
		})
		return message
	}

	/** Если в чате не осталось участников — удалить чат каскадом. */
	private async deleteIfEmpty(tx: GroupTx, chatId: string): Promise<boolean> {
		const left = await tx.chatMember.count({ where: { chatId } })
		if (left === 0) {
			await tx.chat.delete({ where: { id: chatId } })
			return true
		}
		return false
	}

	/** Редактирование информации GROUP-чата (только chat ADMIN). */
	async updateGroupInfo(
		actorId: string,
		chatId: string,
		dto: UpdateGroupChatDto
	) {
		const hasName = typeof dto.name !== 'undefined'
		const hasDescription = typeof dto.description !== 'undefined'
		const hasImage = typeof dto.imageUrl !== 'undefined'
		if (!hasName && !hasDescription && !hasImage) {
			throw new BadRequestException('Нечего обновлять: передайте хотя бы одно поле')
		}
		const name = hasName ? dto.name!.trim() : undefined
		if (hasName && !name) {
			throw new BadRequestException('Название не может быть пустым')
		}

		return this.prisma.$transaction(async tx => {
			await this.requireGroupChat(tx, chatId)
			await this.requireChatAdmin(tx, actorId, chatId)
			await tx.chat.update({
				where: { id: chatId },
				data: {
					...(hasName ? { name } : undefined),
					...(hasDescription
						? { description: dto.description?.trim() || null }
						: undefined),
					...(hasImage ? { imageUrl: dto.imageUrl?.trim() || null } : undefined)
				}
			})
			return this.getChatById(chatId)
		})
	}

	/** Добавление участников (только chat ADMIN) + системное сообщение. */
	async addGroupMembers(
		actorId: string,
		chatId: string,
		dto: AddGroupMembersDto
	) {
		return this.prisma.$transaction(async tx => {
			await this.requireGroupChat(tx, chatId)
			await this.requireChatAdmin(tx, actorId, chatId)

			const requested = [...new Set(dto.memberIds.map(id => id.trim()))].filter(
				id => id.length > 0
			)
			const existing = await tx.chatMember.findMany({
				where: { chatId, userId: { in: requested } },
				select: { userId: true }
			})
			const existingSet = new Set(existing.map(m => m.userId))
			const fresh = requested.filter(id => !existingSet.has(id))
			if (fresh.length === 0) {
				throw new BadRequestException('Все указанные пользователи уже в чате')
			}

			const users = await tx.user.findMany({
				where: { id: { in: fresh } },
				select: { id: true, name: true }
			})
			if (users.length !== fresh.length) {
				const found = new Set(users.map(u => u.id))
				throw new NotFoundException(
					`Пользователи не найдены: ${fresh.filter(id => !found.has(id)).slice(0, 5).join(', ')}`
				)
			}

			const actor = await tx.user.findUniqueOrThrow({
				where: { id: actorId },
				select: { name: true }
			})
			// lastReadAt=now: вступившие не получают взрыв бейджей по истории.
			await tx.chatMember.createMany({
				data: fresh.map(userId => ({
					userId,
					chatId,
					role: 'MEMBER' as const,
					lastReadAt: new Date()
				}))
			})
			const systemMessage = await this.pushSystemMessage(
				tx,
				chatId,
				actorId,
				`${actor.name} добавил(а): ${users.map(u => u.name).join(', ')}`
			)
			return { chat: await this.getChatById(chatId), addedIds: fresh, systemMessage }
		})
	}

	/** Исключение участника (только chat ADMIN, не себя) — жёсткое удаление. */
	async removeGroupMember(actorId: string, chatId: string, targetId: string) {
		if (targetId === actorId) {
			throw new BadRequestException(
				'Нельзя исключить себя — используйте выход из чата'
			)
		}
		return this.prisma.$transaction(async tx => {
			await this.requireGroupChat(tx, chatId)
			await this.requireChatAdmin(tx, actorId, chatId)

			const target = await tx.chatMember.findUnique({
				where: { userId_chatId: { userId: targetId, chatId } },
				include: { user: { select: { name: true } } }
			})
			if (!target) throw new NotFoundException('Пользователь не в чате')

			await tx.chatMember.delete({
				where: { userId_chatId: { userId: targetId, chatId } }
			})

			if (await this.deleteIfEmpty(tx, chatId)) {
				return { deleted: true as const, chat: null, systemMessage: null, removedId: targetId }
			}

			const actor = await tx.user.findUniqueOrThrow({
				where: { id: actorId },
				select: { name: true }
			})
			const systemMessage = await this.pushSystemMessage(
				tx,
				chatId,
				actorId,
				`${actor.name} исключил(а): ${target.user.name}`
			)
			return {
				deleted: false as const,
				chat: await this.getChatById(chatId),
				systemMessage,
				removedId: targetId
			}
		})
	}

	/** Выход из GROUP-чата по своей воле (любой участник). */
	async leaveGroupChat(userId: string, chatId: string) {
		return this.prisma.$transaction(async tx => {
			await this.requireGroupChat(tx, chatId)
			const membership = await tx.chatMember.findUnique({
				where: { userId_chatId: { userId, chatId } },
				include: { user: { select: { name: true } } }
			})
			if (!membership) {
				throw new ForbiddenException('Вы не являетесь участником этого чата')
			}

			await tx.chatMember.delete({
				where: { userId_chatId: { userId, chatId } }
			})

			if (await this.deleteIfEmpty(tx, chatId)) {
				return { deleted: true as const, chat: null, systemMessage: null }
			}

			const systemMessage = await this.pushSystemMessage(
				tx,
				chatId,
				userId,
				`${membership.user.name} покинул(а) чат`
			)
			return {
				deleted: false as const,
				chat: await this.getChatById(chatId),
				systemMessage
			}
		})
	}
}
