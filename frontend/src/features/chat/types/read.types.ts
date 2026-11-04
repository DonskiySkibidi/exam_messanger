import type { IChatMember } from "@/src/shared/types";

/** Состояние прочтения собственного сообщения (null — тики не показываем). */
export type ReadState =
  | { level: "sent" }
  | { level: "read" }
  | { level: "read-all" }
  | { level: "read-some"; readBy: string[] };

/** Ответ markRead: серверная истина для локального патча кэша. */
export interface MarkReadResult {
  lastReadAt: string;
  advanced: boolean;
  unreadCount: number;
}

export interface ReadMember {
  userId: string;
  lastReadAt: string;
}

/** Минимальный срез чата, нужный read-логике (без привязки к IChat). */
export interface ReadContext {
  currentUserId: string;
  isGroup: boolean;
  members: ReadMember[];
}
