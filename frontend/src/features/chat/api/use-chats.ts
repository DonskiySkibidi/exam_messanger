"use client";

import { chatApi } from "@/src/shared/api";
import { useSocketEvent } from "@/src/shared/lib";
import type { IChat } from "@/src/shared/types";
import type { NotificationPayload } from "@/src/features/chat/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

export const CHATS_QUERY_KEY = ["chats"] as const;

export type { NotificationPayload };

/** Сортировка: свежие сверху (по lastMessage.createdAt ?? updatedAt). */
function sortChats(chats: IChat[]): IChat[] {
  return [...chats].sort((a, b) => {
    const at = a.lastMessage?.createdAt ?? a.updatedAt;
    const bt = b.lastMessage?.createdAt ?? b.updatedAt;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

export function useChats() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CHATS_QUERY_KEY,
    queryFn: () => chatApi.getMyChats(),
    // Данные живут пушами из `notifications`; рефетч только при монтировании.
    staleTime: Infinity,
  });

  const patchChat = useCallback(
    (chatId: string, patch: (chat: IChat) => IChat) => {
      queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) =>
        prev ? sortChats(prev.map((c) => (c.id === chatId ? patch(c) : c))) : prev,
      );
    },
    [queryClient],
  );

  useSocketEvent<NotificationPayload>("notifications", (payload) => {
    switch (payload.kind) {
      case "chat:preview":
        // unreadCount — всегда авторитетный с сервера. Для открытого чата
        // его уточнит ack видимости (markRead), а не локальная догадка:
        // сообщение ниже фолда не должно обнулять бейдж.
        patchChat(payload.chatId, (chat) => ({
          ...chat,
          lastMessage: payload.lastMessage,
          updatedAt: payload.updatedAt,
          unreadCount: payload.unreadCount,
        }));
        break;

      case "chat:created":
        queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) => {
          if (!prev) return [{ ...payload.chat, unreadCount: payload.unreadCount }];
          if (prev.some((c) => c.id === payload.chat.id)) return prev;
          return sortChats([
            { ...payload.chat, unreadCount: payload.unreadCount },
            ...prev,
          ]);
        });
        break;

      case "chat:updated":
        // Инфо/состав изменились: заменяем объект (upsert — добавленного
        // может не быть в списке). Локальный unreadCount сохраняем.
        queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) => {
          if (!prev) return [{ ...payload.chat, unreadCount: 0 }];
          const existing = prev.find((c) => c.id === payload.chat.id);
          const merged = {
            ...payload.chat,
            unreadCount: existing?.unreadCount ?? 0,
          };
          return existing
            ? prev.map((c) => (c.id === payload.chat.id ? merged : c))
            : sortChats([merged, ...prev]);
        });
        break;

      case "chat:removed":
        // Исключили/вышел/чат удалён: убираем из сайдбара.
        queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) =>
          prev?.filter((c) => c.id !== payload.chatId),
        );
        break;

      case "chat:read": {
        // Пир продвинул водяной знак: обновляем его метку в членах чата,
        // футеры собственных сообщений пересчитаются сами. Свой кэш
        // читателя не трогаем — он уже обновлён через ack markRead.
        const { chatId, userId, lastReadAt } = payload;
        queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) =>
          prev?.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  members: chat.members.map((m) =>
                    m.userId === userId ? { ...m, lastReadAt } : m,
                  ),
                }
              : chat,
          ),
        );
        break;
      }

      case "presence":
        queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) =>
          prev?.map((chat) => ({
            ...chat,
            members: chat.members.map((m) =>
              m.userId === payload.userId
                ? { ...m, user: { ...m.user, isOnline: payload.isOnline } }
                : m,
            ),
          })),
        );
        break;
    }
  });

  // Счётчик непрочитанных в заголовке вкладки.
  useEffect(() => {
    const total = (query.data ?? []).reduce(
      (sum, c) => sum + (c.unreadCount ?? 0),
      0,
    );
    document.title = total > 0 ? `(${total}) Messenger` : "Messenger";
  }, [query.data]);

  return { ...query, sortChats };
}
