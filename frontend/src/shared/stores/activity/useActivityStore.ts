import type { IAttachment } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Базовая вкладка сайдбара — единственное из UI, что переживает F5. */
export type SidebarTab = "chats" | "search" | "account";

/** Боковая панель с информацией: детали группы ИЛИ профиль юзера. */
export type InfoPanelState =
  | { kind: "group" }
  | { kind: "user"; user: IUser }
  | null;

/** Полноэкранный просмотр вложений. key — чтобы пересоздавать карусель. */
export interface AttachmentViewerState {
  attachments: IAttachment[];
  index: number;
  key: number;
}

/** Подмножество, которое реально пишем в sessionStorage. */
export interface PersistedActivity {
  activeChatId: string | null;
  sidebarTab: SidebarTab;
}

export interface ActivityState extends PersistedActivity {
  /** Временные активности — НЕ персистятся, живут только до F5. */
  infoPanel: InfoPanelState;
  viewer: AttachmentViewerState | null;

  setActiveChat: (chatId: string) => void;
  clearActiveChat: () => void;
  setSidebarTab: (tab: SidebarTab) => void;

  openGroupPanel: () => void;
  openUserPanel: (user: IUser) => void;
  closeInfoPanel: () => void;

  openViewer: (attachments: IAttachment[], index: number) => void;
  setViewerIndex: (index: number) => void;
  closeViewer: () => void;

  /** Ручной сброс всего временного (на случай рассинхрона). */
  resetTransient: () => void;
}

const TRANSIENT_DEFAULTS = {
  infoPanel: null,
  viewer: null,
} satisfies Pick<ActivityState, "infoPanel" | "viewer">;

let viewerSeq = 0;

/**
 * Глобальная UI-активность мессенджера.
 *
 * Что персистим (partialize): только activeChatId + sidebarTab.
 * Всё временное (infoPanel, viewer) при F5 отваливается само — его нет
 * в снапшоте, а onRehydrateStorage ниже дожимает дефолты даже если
 * в storage завалялись ключи от старой версии стора.
 */
export const useActivityStore = create<ActivityState>()(
  persist<ActivityState, [], [], PersistedActivity>(
    (set) => ({
      activeChatId: null,
      sidebarTab: "chats",
      ...TRANSIENT_DEFAULTS,

      setActiveChat: (chatId) =>
        set({ activeChatId: chatId, infoPanel: null, viewer: null }),
      clearActiveChat: () =>
        set({ activeChatId: null, infoPanel: null, viewer: null }),
      setSidebarTab: (tab) => set({ sidebarTab: tab }),

      openGroupPanel: () => set({ infoPanel: { kind: "group" } }),
      openUserPanel: (user) => set({ infoPanel: { kind: "user", user } }),
      closeInfoPanel: () => set({ infoPanel: null }),

      openViewer: (attachments, index) =>
        set({ viewer: { attachments, index, key: ++viewerSeq } }),
      setViewerIndex: (index) =>
        set((s) => (s.viewer ? { viewer: { ...s.viewer, index } } : s)),
      closeViewer: () => set({ viewer: null }),

      resetTransient: () => set({ ...TRANSIENT_DEFAULTS }),
    }),
    {
      name: "chat-activity",
      version: 1,
      // Фабрика вместо прямого sessionStorage: на сервере (SSR) модуль
      // просто импортируется, а sessionStorage трогается только в браузере.
      storage: createJSONStorage(() => sessionStorage),
      // КЛЮЧЕВОЕ МЕСТО: в storage уезжают только эти два поля.
      partialize: (s): PersistedActivity => ({
        activeChatId: s.activeChatId,
        sidebarTab: s.sidebarTab,
      }),
      // Пояс безопасности: даже если снапшот содержит лишнее
      // (старая версия стора), временное принудительно гасится.
      onRehydrateStorage: () => (rehydrated, error) => {
        if (error || !rehydrated) return;
        useActivityStore.setState({ ...TRANSIENT_DEFAULTS });
      },
    },
  ),
);
