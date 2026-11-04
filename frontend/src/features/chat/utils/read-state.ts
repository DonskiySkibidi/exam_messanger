import type { ReadContext, ReadState } from "@/src/features/chat/types";

interface ComputeReadInput extends ReadContext {
  /** true — сообщение отправлено текущим пользователем. */
  isOwn: boolean;
  /** ISO-дата создания сообщения. */
  createdAt: string;
  /** Имена участников для тултипа (userId → имя). */
  names?: ReadonlyMap<string, string>;
}

/**
 * Чистое вычисление состояния прочтения СОБСТВЕННОГО сообщения
 * по серверным водяным знакам участников (ChatMember.lastReadAt).
 * Для входящих возвращает null — чужие тики не рисуем никогда.
 * - DIRECT: прочитал ли собеседник (его lastReadAt >= createdAt).
 * - GROUP: все остальные прочитали → read-all; кто-то → read-some + имена.
 */
export function computeReadState(input: ComputeReadInput): ReadState | null {
  if (!input.isOwn) return null;

  const createdAt = new Date(input.createdAt).getTime();
  if (Number.isNaN(createdAt)) return { level: "sent" };

  const others = input.members.filter(
    (m) => m.userId !== input.currentUserId,
  );
  if (others.length === 0) return { level: "sent" };

  const readers = others.filter(
    (m) => new Date(m.lastReadAt).getTime() >= createdAt,
  );

  if (input.isGroup) {
    if (readers.length === 0) return { level: "sent" };
    if (readers.length === others.length) return { level: "read-all" };
    return {
      level: "read-some",
      readBy: readers.map(
        (m) => input.names?.get(m.userId) ?? m.userId,
      ),
    };
  }

  return readers.length > 0 ? { level: "read" } : { level: "sent" };
}
