import type { IChat } from "@/src/shared/types";
import type { IMessage } from "@/src/shared/types";

/**
 * Контракт события `notifications` — зеркало backend ChatNotifier.
 * Единственный канал сайдбара: превью, новые диалоги, presence.
 */
export type NotificationPayload =
  | {
      kind: "chat:preview";
      chatId: string;
      lastMessage: IMessage;
      unreadCount: number;
      updatedAt: string;
    }
  | { kind: "chat:created"; chat: IChat; unreadCount: number }
  | { kind: "chat:updated"; chat: IChat }
  | { kind: "chat:removed"; chatId: string }
  | {
      kind: "chat:read";
      chatId: string;
      userId: string;
      lastReadAt: string;
    }
  | { kind: "presence"; userId: string; isOnline: boolean };
