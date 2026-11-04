"use client";

import { chatApi } from "@/src/shared/api";
import { getSocket, useSocketEvent } from "@/src/shared/lib";
import type { IMessage } from "@/src/shared/types";
import { emitWithAck } from "@/src/features/chat/utils";
import type { ISendPayload } from "@/src/features/chat/types";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";

export const PAGE_SIZE = 75;

export function messagesQueryKey(chatId: string) {
  return ["messages", chatId] as const;
}

/**
 * История порциями по 75, обратная пагинация (вверх).
 * API отдаёт DESC (новые первые): pageParams — cursor последнего (самого старого) id.
 */
export function useChatMessages(chatId: string) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: messagesQueryKey(chatId),
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      chatApi.getMessages(chatId, PAGE_SIZE, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.id;
    },
    staleTime: 5_000,
    enabled: Boolean(chatId),
  });

  // Живые сообщения текущего чата → append в конец (хронология снизу).
  useSocketEvent<IMessage>("newMessage", (message) => {
    if (message.chatId !== chatId) return;
    queryClient.setQueryData(
      messagesQueryKey(chatId),
      (prev: { pages: IMessage[][]; pageParams: unknown[] } | undefined) => {
        if (!prev) return prev;
        const pages = [...prev.pages];
        const last = [...(pages[pages.length - 1] ?? [])];
        if (last.some((m) => m.id === message.id)) return prev;
        last.unshift(message);
        pages[pages.length - 1] = last;
        return { ...prev, pages };
      },
    );
  });

  // Открыли чат → join комнаты. Прочтение отмечает useReadObserver
  // по фактической видимости (единый путь markChatRead, без дублей).
  useEffect(() => {
    if (!chatId) return;
    const s = getSocket();
    s.emit("joinRoom", { chatId });
    return () => {
      s.emit("leaveRoom", { chatId });
    };
  }, [chatId]);

  return query;
}

const isMessageResponse = (r: unknown): r is IMessage =>
  !!r && typeof r === "object" && typeof (r as IMessage).id === "string";

/** Аттачмент строго по контракту AttachmentInputDto: без previewUrl и прочего. */
function toAttachmentPayload(
  attachments: ISendPayload["attachments"],
): ISendPayload["attachments"] {
  return attachments?.map(({ url, fileName, fileSize, mimeType }) => ({
    url,
    fileName,
    fileSize,
    mimeType,
  }));
}

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ISendPayload) =>
      emitWithAck<IMessage>(
        "sendMessage",
        { chatId, content: body.content, attachments: toAttachmentPayload(body.attachments) },
        isMessageResponse,
      ),
    onSuccess: (message) => {
      queryClient.setQueryData(
        messagesQueryKey(chatId),
        (prev: { pages: IMessage[][]; pageParams: unknown[] } | undefined) => {
          if (!prev) return prev;
          const pages = [...prev.pages];
          const last = [...(pages[pages.length - 1] ?? [])];
          if (!last.some((m) => m.id === message.id)) last.unshift(message);
          pages[pages.length - 1] = last;
          return { ...prev, pages };
        },
      );
    },
  });
}

/** Первое сообщение незнакомцу: создаёт или переиспользует DIRECT (single-write по WS). */
export function useSendDirectMessage() {
  return useMutation({
    mutationFn: (body: { recipientId: string; content?: string }) =>
      emitWithAck<{ message: IMessage; chatId: string; created: boolean }>(
        "sendDirectMessage",
        body,
        (r): r is { message: IMessage; chatId: string; created: boolean } =>
          !!r && typeof r === "object" && isMessageResponse((r as { message: unknown }).message),
      ),
  });
}
