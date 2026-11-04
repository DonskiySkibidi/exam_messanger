import { ChatService } from './chat.service.js'
import { PrismaService } from '@/prisma/prisma.service.js'
import {
	BadRequestException,
	ForbiddenException,
	NotFoundException
} from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * markChatRead: водяной знак lastReadAt.
 * Prisma мокается (unit-уровень, без БД): проверяем ветвления,
 * идемпотентность и форму запросов (исключение своих из unread).
 */
describe('ChatService.markChatRead', () => {
	const T0 = new Date('2026-10-01T10:00:00.000Z')
	const T1 = new Date('2026-10-01T10:05:00.000Z')

	const chatMember = { findUnique: vi.fn(), update: vi.fn() }
	const message = { findUnique: vi.fn(), count: vi.fn() }
	const prisma = { chatMember, message } as unknown as PrismaService
	const service = new ChatService(prisma)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('не участнику отказывает 403 и ничего не пишет', async () => {
		chatMember.findUnique.mockResolvedValue(null)

		await expect(service.markChatRead('ghost', 'chat1')).rejects.toBeInstanceOf(
			ForbiddenException
		)
		expect(chatMember.update).not.toHaveBeenCalled()
		expect(message.findUnique).not.toHaveBeenCalled()
	})

	it('сообщение из чужого чата отклоняет 400', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T0 })
		message.findUnique.mockResolvedValue({ chatId: 'other-chat', createdAt: T1 })

		await expect(
			service.markChatRead('u1', 'chat1', 'msg-x')
		).rejects.toBeInstanceOf(BadRequestException)
		expect(chatMember.update).not.toHaveBeenCalled()
	})

	it('неизвестное сообщение даёт 404', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T0 })
		message.findUnique.mockResolvedValue(null)

		await expect(
			service.markChatRead('u1', 'chat1', 'msg-missing')
		).rejects.toBeInstanceOf(NotFoundException)
		expect(chatMember.update).not.toHaveBeenCalled()
	})

	it('повтор по тому же сообщению идемпотентен: advanced=false, записи нет', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T1 })
		message.findUnique.mockResolvedValue({ chatId: 'chat1', createdAt: T1 })
		message.count.mockResolvedValue(0)

		const result = await service.markChatRead('u1', 'chat1', 'msg-1')

		expect(result).toEqual({ lastReadAt: T1, advanced: false, unreadCount: 0 })
		expect(chatMember.update).not.toHaveBeenCalled()
	})

	it('продвигает знак до createdAt сообщения и возвращает серверный unread', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T0 })
		message.findUnique.mockResolvedValue({ chatId: 'chat1', createdAt: T1 })
		chatMember.update.mockResolvedValue({ lastReadAt: T1 })
		message.count.mockResolvedValue(2)

		const result = await service.markChatRead('u1', 'chat1', 'msg-1')

		expect(chatMember.update).toHaveBeenCalledWith({
			where: { userId_chatId: { userId: 'u1', chatId: 'chat1' } },
			data: { lastReadAt: T1 },
			select: { lastReadAt: true }
		})
		expect(result).toEqual({ lastReadAt: T1, advanced: true, unreadCount: 2 })
	})

	it('без upToMessageId ставит now() (открытие чата)', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T0 })
		chatMember.update.mockImplementation((args: unknown) => {
			const data = (args as { data: { lastReadAt: Date } }).data
			return Promise.resolve({ lastReadAt: data.lastReadAt })
		})
		message.count.mockResolvedValue(0)

		const before = Date.now()
		const result = await service.markChatRead('u1', 'chat1')

		expect(result.advanced).toBe(true)
		expect(result.lastReadAt.getTime()).toBeGreaterThanOrEqual(before)
	})

	it('unread считает только чужие сообщения после знака', async () => {
		chatMember.findUnique.mockResolvedValue({ id: 'm1', lastReadAt: T0 })
		message.findUnique.mockResolvedValue({ chatId: 'chat1', createdAt: T1 })
		chatMember.update.mockResolvedValue({ lastReadAt: T1 })
		message.count.mockResolvedValue(0)

		await service.markChatRead('u1', 'chat1', 'msg-1')

		expect(message.count).toHaveBeenCalledWith({
			where: { chatId: 'chat1', senderId: { not: 'u1' }, createdAt: { gt: T1 } }
		})
	})
})
