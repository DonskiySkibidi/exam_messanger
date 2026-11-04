"use client";

import { chatApi, type MarkReadResult } from "@/src/shared/api";
import { CHATS_QUERY_KEY } from "@/src/features/chat/api";
import { emitWithAck } from "@/src/features/chat/utils";
import type { IChat } from "@/src/shared/types";
import type { QueryClient } from "@tanstack/react-query";

function isMarkReadResponse(r: unknown): r is MarkReadResult {
  return (
    !!r &&
    typeof r === "object" &&
    typeof (r as MarkReadResult).lastReadAt === "string" &&
    typeof (r as MarkReadResult).unreadCount === "number"
  );
}

/**
 * Единая точка отметки прочтения (single-write).
 * WS-first по соглашению проекта (ответ валидируется предикатом),
 * при таймауте/обрыве — один REST-фолбэк. Двойных вызовов нет.
 */
export async function markChatRead(
  chatId: string,
  upToMessageId?: string,
): Promise<MarkReadResult> {
  const payload = { chatId, ...(upToMessageId ? { upToMessageId } : {}) };
  try {
    return await emitWithAck<MarkReadResult>(
      "markRead",
      payload,
      isMarkReadResponse,
    );
  } catch {
    return chatApi.markRead(chatId, upToMessageId);
  }
}

/**
 * Применение серверного подтверждения к кэшу: свой водяной знак
 * и авторитетный unreadCount. Используют и observer, и кнопка «вниз»,
 * чтобы не дублировать патч.
 */
export function applyMarkReadAck(
  queryClient: QueryClient,
  chatId: string,
  currentUserId: string,
  ack: MarkReadResult,
): void {
  queryClient.setQueryData<IChat[]>(CHATS_QUERY_KEY, (prev) =>
    prev?.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            unreadCount: ack.unreadCount,
            members: chat.members.map((m) =>
              m.userId === currentUserId
                ? { ...m, lastReadAt: ack.lastReadAt }
                : m,
            ),
          }
        : chat,
    ),
  );
}
