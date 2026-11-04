"use client";

import { CreateGroupSheet, ProfileSettings } from "@/src/features/chat";
import { useChats, useProfile, useUserSearch } from "@/src/features/chat";
import { authService } from "@/src/features/auth";
import { ItemGroup, ScrollArea, ScrollBar } from "@/src/shared/components";
import { useActivityStore } from "@/src/shared/stores";
import { GlobalRole } from "@/src/shared/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChatListItem,
  SidebarHeader,
  UserSearchList,
} from "@/src/widgets/sidebar/ui";

/**
 * widgets/sidebar: Header (поиск + Options/Back + ADMIN «+»),
 * режимы chats/search/account, бейджи, реактивный топ активного чата.
 * Вкладка живёт в activity-сторе (переживает F5 через sessionStorage).
 */
export function Sidebar() {
  // Селекторы по полям вместо всего стора — без лишних ререндеров.
  const mode = useActivityStore((s) => s.sidebarTab);
  const setMode = useActivityStore((s) => s.setSidebarTab);
  const [searchValue, setSearchValue] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const params = useParams<{ chatId?: string }>();
  const activeChatId = params?.chatId;
  const router = useRouter();

  const { data: chats = [], isPending } = useChats();
  const { data: profile } = useProfile();
  const { data: users = [] } = useUserSearch(searchValue, mode === "search");

  const isAdmin = profile?.role === GlobalRole.ADMIN;
  const currentUserId = profile?.id ?? "";

  const logout = async () => {
    await authService.logout().catch(() => null);
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen flex-col items-center gap-3 p-2 bg-[#e9e9e94a]">
      <SidebarHeader
        mode={mode}
        searchValue={searchValue}
        isAdmin={isAdmin}
        onSearchChange={(v) => setSearchValue(v)}
        onSearchFocus={() => setMode("search")}
        onBack={() => {
          setMode("chats");
          setSearchValue("");
        }}
        onAccount={() => setMode("account")}
        onLogout={() => void logout()}
        onCreateGroup={() => setGroupOpen(true)}
      />

      {mode === "account" ? (
        <ScrollArea className="h-full w-full flex-1">
          <ProfileSettings
            onBack={() => {
              setMode("chats");
              setSearchValue("");
            }}
          />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      ) : (
        <ScrollArea className="h-full w-full flex-1">
          {mode === "search" ? (
            <UserSearchList users={users} searchValue={searchValue} />
          ) : isPending ? (
            <p className="p-4 text-sm text-muted-foreground">Загрузка чатов…</p>
          ) : chats.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Чатов пока нет. Найдите пользователя через поиск.
            </p>
          ) : (
            <ItemGroup>
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  currentUserId={currentUserId}
                  active={chat.id === activeChatId}
                />
              ))}
            </ItemGroup>
          )}
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      )}

      <CreateGroupSheet open={groupOpen} onOpenChange={setGroupOpen} />
    </div>
  );
}
