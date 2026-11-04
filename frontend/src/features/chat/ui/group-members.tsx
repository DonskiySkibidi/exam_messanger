"use client";

import { useRemoveMember } from "@/src/features/chat/api";
import { toProfileUser } from "@/src/features/chat/utils";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/src/shared/components";
import type { IChat } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";
import { toastMessageHandler } from "@/src/shared/utils";

interface GroupMembersProps {
  chatId: string;
  members: IChat["members"];
  currentUserId: string;
  canManage: boolean;
  onSelectUser: (user: IUser) => void;
}

/** Список участников: клик — профиль, правый клик (ADMIN, не себя) — исключить. */
export function GroupMembers({
  chatId,
  members,
  currentUserId,
  canManage,
  onSelectUser,
}: GroupMembersProps) {
  const removeMember = useRemoveMember(chatId);

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-xs font-semibold text-muted-foreground">
        Участники · {members.length}
      </p>
      {members.map((m) => {
        const row = (
          <button
            type="button"
            onClick={() => onSelectUser(toProfileUser(m))}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <AvatarWithStatus isOnline={m.user.isOnline} size="default">
              <Avatar>
                {m.user.image ? <AvatarImage src={m.user.image} /> : null}
                <AvatarFallback>
                  {m.user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </AvatarWithStatus>
            <span className="line-clamp-1">{m.user.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {m.role}
            </span>
          </button>
        );
        if (!canManage || m.userId === currentUserId)
          return <div key={m.id}>{row}</div>;
        return (
          <ContextMenu key={m.id}>
            <ContextMenuTrigger render={row} />
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onClick={() =>
                  removeMember.mutate(m.userId, {
                    onError: (e) =>
                      toastMessageHandler(
                        e instanceof Error ? e : Error(String(e)),
                      ),
                  })
                }
              >
                Исключить из чата
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
