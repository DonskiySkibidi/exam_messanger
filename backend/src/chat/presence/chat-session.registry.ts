import { Injectable } from '@nestjs/common'

/**
 * Реестр живых WS-сессий: userId → Set<socketId>.
 * Один пользователь может держать несколько вкладок/устройств,
 * поэтому именно Set, а не одиночный socketId. offline считаем
 * только когда Set пустеет.
 */
@Injectable()
export class ChatSessionRegistry {
	private readonly sessions = new Map<string, Set<string>>()

	/** Добавить сессию. Возвращает число активных сессий пользователя. */
	public add(userId: string, socketId: string): number {
		let set = this.sessions.get(userId)
		if (!set) {
			set = new Set()
			this.sessions.set(userId, set)
		}
		set.add(socketId)
		return set.size
	}

	/** Убрать сессию. Возвращает оставшееся число сессий. */
	public remove(userId: string, socketId: string): number {
		const set = this.sessions.get(userId)
		if (!set) return 0
		set.delete(socketId)
		if (set.size === 0) this.sessions.delete(userId)
		return set.size
	}

	/** Есть ли у пользователя хоть одна живая сессия. */
	public has(userId: string): boolean {
		return (this.sessions.get(userId)?.size ?? 0) > 0
	}

	public socketIds(userId: string): string[] {
		return [...(this.sessions.get(userId) ?? [])]
	}

	public get onlineCount(): number {
		return this.sessions.size
	}
}
