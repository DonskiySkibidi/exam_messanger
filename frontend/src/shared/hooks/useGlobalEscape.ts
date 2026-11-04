"use client";

import { useActivityStore } from "@/src/shared/stores";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Глобальный Escape для мессенджера. Иерархия закрытия (строго по шагам,
 * один keydown — один шаг):
 *   1. просмотр вложения -> 2. боковая панель чата -> 3. вкладка сайдбара
 *   в "chats" -> 4. снять фокус с чата (store + переход на /dashboard) ->
 *   5. нечего закрывать — просто blur активного элемента.
 *
 * Слушатель висит на window в CAPTURE-фазе и при поглощённом шаге делает
 * stopPropagation: Base UI-диалоги тоже закрываются по Escape, и без этого
 * один keydown закрыл бы сразу два слоя (их хендлер + наш). Когда шагов
 * в сторе нет — событие пропускаем, чтобы не ломать локальные менюшки
 * (DropdownMenu/ContextMenu/Sheet), живущие вне стора.
 */
export function useGlobalEscape(enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.repeat) return;

      const s = useActivityStore.getState();

      if (s.viewer) {
        s.closeViewer();
      } else if (s.infoPanel) {
        s.closeInfoPanel();
      } else if (s.sidebarTab !== "chats") {
        s.setSidebarTab("chats");
      } else if (s.activeChatId) {
        s.clearActiveChat();
        router.push("/dashboard");
      } else {
        // Закрывать нечего и уходить некуда — не перехватываем.
        return;
      }

      // Шаг поглощён нами — гасим всплытие, чтобы Base UI не сделал
      // второй шаг поверх нашего. sessionStorage обновится сам
      // через persist-подписку стора.
      e.stopPropagation();
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, router]);
}
