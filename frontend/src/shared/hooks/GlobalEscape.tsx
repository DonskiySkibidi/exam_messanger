"use client";

import { useGlobalEscape } from "@/src/shared/hooks";

/**
 * Точка монтирования глобального Escape (кладётся в dashboard-layout,
 * рендерит null). Один инстанс на всё приложение.
 */
export function GlobalEscape() {
  useGlobalEscape(true);
  return null;
}
