"use client";

import { applyMarkReadAck, markChatRead } from "@/src/features/chat/api/mark-read";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseJumpToBottomInput {
  chatId: string;
  currentUserId: string;
  /** Тот же хост, что у useReadObserver (viewport ищем внутри). */
  hostRef: RefObject<HTMLElement | null>;
  /** Якорь самого низа ленты. */
  bottomRef: RefObject<HTMLElement | null>;
}

/**
 * Кнопка «вниз»: видна, когда низ ленты вне видимости.
 * Клик — плавный скролл в самый низ + отметка ВСЕГО чата прочитанным
 * (blanket-markRead без upToMessageId: внизу всё загруженное видно,
 * остальное — история выше, которую пользователь пролистал).
 * Ошибка — тихо: видимые добьёт observer, бейдж останется честным.
 */
export function useJumpToBottom({
  chatId,
  currentUserId,
  hostRef,
  bottomRef,
}: UseJumpToBottomInput) {
  const queryClient = useQueryClient();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const bottom = bottomRef.current;
    if (!host || !bottom || !chatId) {
      setShowButton(false);
      return;
    }
    const root =
      host.querySelector('[data-slot="scroll-area-viewport"]') ?? undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setShowButton(!entry?.isIntersecting),
      { root, threshold: 0 },
    );
    observer.observe(bottom);
    return () => observer.disconnect();
  }, [chatId, hostRef, bottomRef]);

  const jump = useCallback(() => {
    const host = hostRef.current;
    const viewport = host?.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    if (!chatId || !currentUserId) return;
    void markChatRead(chatId)
      .then((ack) => applyMarkReadAck(queryClient, chatId, currentUserId, ack))
      .catch(() => {
        // Не шлём ошибку в UI: observer добьёт видимое следующим флашом.
      });
  }, [chatId, currentUserId, hostRef, bottomRef, queryClient]);

  return { showButton, jump };
}
