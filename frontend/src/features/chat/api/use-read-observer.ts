"use client";

import { applyMarkReadAck, markChatRead } from "@/src/features/chat/api";
import { selectReadableBatch } from "@/src/features/chat/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, type RefObject } from "react";

/** Доля видимости элемента + задержка: мелькнувшее не считаем прочитанным. */
const VISIBILITY_THRESHOLD = 0.5;
const READ_DELAY_MS = 800;

interface UseReadObserverInput {
  chatId: string;
  currentUserId: string;
  /** Обёртка вокруг ScrollArea: viewport ищем внутри неё. */
  hostRef: RefObject<HTMLElement | null>;
  /** Свой водяной знак из members (точка отсчёта подтверждённого). */
  ownLastReadAt: string | null;
  /** Сигнатура списка (меняется при append/prepend) для пересканирования. */
  revision: string;
}

/**
 * Прочтение по фактической видимости (только активный чат).
 * - IntersectionObserver с root = ScrollArea-viewport (не окно браузера).
 * - Кандидаты копятся в pending; общий флаш раз в READ_DELAY_MS шлёт
 *   ОДИН markRead с максимальным upToMessageId.
 * - Свои сообщения и уже подтверждённые отсекает чистая selectReadableBatch.
 * - Подтверждение (ack) двигает confirmed-водяной знак и патчит кэш чатов
 *   серверными значениями (lastReadAt + unreadCount) — без перезагрузки.
 * - При смене чата/размонтированииpending старого чата доотправляется.
 */
export function useReadObserver({
  chatId,
  currentUserId,
  hostRef,
  ownLastReadAt,
  revision,
}: UseReadObserverInput): void {
  const queryClient = useQueryClient();
  // Подтверждённые водяные знаки — СТРОГО по чатам: late-ack старого чата
  // никогда не должен двигать знак нового (часы не сравнимы между тредами).
  const confirmedByChat = useRef(new Map<string, string>());
  const pendingRef = useRef(
    new Map<string, { createdAt: string; senderId: string }>(),
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Свежий проп ownLastReadAt для фолбэка (кэш чатов мог обновиться сбоку).
  const ownLastReadAtRef = useRef(ownLastReadAt);
  ownLastReadAtRef.current = ownLastReadAt;

  // Смена чата: новый отсчёт подтверждённого от его водяного знака.
  useEffect(() => {
    if (ownLastReadAt) confirmedByChat.current.set(chatId, ownLastReadAt);
    pendingRef.current.clear();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [chatId, ownLastReadAt]);

  // Флаш: один markRead на максимум видимого. Не привязан к рендеру.
  // Все значения — из замыкания этого запуска эффекта, поэтому cleanup
  // при смене чата доотправляет именно СТАРЫЙ чат, а не новый.
  useEffect(() => {
    const flush = () => {
      timerRef.current = null;
      if (!chatId || !currentUserId || pendingRef.current.size === 0) return;
      const batch = selectReadableBatch(
        [...pendingRef.current.entries()].map(([id, v]) => ({
          id,
          ...v,
        })),
        currentUserId,
        confirmedByChat.current.get(chatId) ?? ownLastReadAtRef.current,
      );
      if (!batch) return;
      // Снапшот флаша: late-ack чистит только свои id, чужие не трогает.
      const snapshot = [...pendingRef.current.entries()];
      void markChatRead(chatId, batch.upToId)
        .then((ack) => {
          // Только вперёд в рамках ЭТОГО чата: ack несёт серверную истину.
          const prev = confirmedByChat.current.get(chatId);
          if (
            !prev ||
            new Date(ack.lastReadAt).getTime() > new Date(prev).getTime()
          ) {
            confirmedByChat.current.set(chatId, ack.lastReadAt);
          }
          for (const [id, v] of snapshot) {
            if (new Date(v.createdAt).getTime() <= new Date(ack.lastReadAt).getTime()) {
              pendingRef.current.delete(id);
            }
          }
          applyMarkReadAck(queryClient, chatId, currentUserId, ack);
        })
        .catch(() => {
          // Ошибка/таймаут: pending остаётся — повтор при следующем
          // изменении видимости. Неподтверждённое не показываем как факт.
        });
    };

    const schedule = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(flush, READ_DELAY_MS);
    };

    const host = hostRef.current;
    if (!host || !chatId || !currentUserId) return;
    const root =
      host.querySelector('[data-slot="scroll-area-viewport"]') ?? undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.messageId;
          const createdAt = el.dataset.createdAt;
          const senderId = el.dataset.senderId;
          if (!id || !createdAt || !senderId) continue;
          if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD) {
            if (!pendingRef.current.has(id)) {
              pendingRef.current.set(id, { createdAt, senderId });
              changed = true;
            }
          } else {
            if (pendingRef.current.delete(id)) changed = true;
          }
        }
        if (changed) schedule();
      },
      { root, threshold: VISIBILITY_THRESHOLD },
    );

    // Наблюдаем именно элементы сообщений, а не рендеры: пересканирование
    // при смене revision (append/prepend/пагинация/ремоунт).
    const nodes = host.querySelectorAll<HTMLElement>("[data-message-id]");
    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Уход из чата: видимое действительно видели — доотправляем.
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, currentUserId, revision, queryClient]);
}
