"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
} from "@/src/shared/components";
import { ChatType, type IChat } from "@/src/shared/types";

interface IProps {
  chat: IChat;
  currentUserId: string;
  onOpenProfile: () => void;
  onOpenGroup: () => void;
}

function directPeer(chat: IChat, currentUserId: string) {
  return chat.members.find((m) => m.userId !== currentUserId)?.user;
}

/** Шапка чата: клик → Dialog (DIRECT) или Sheet (GROUP). */
export function ChatHeader({
  chat,
  currentUserId,
  onOpenProfile,
  onOpenGroup,
}: IProps) {
  const isDirect = chat.type === ChatType.DIRECT;
  const peer = isDirect ? directPeer(chat, currentUserId) : undefined;
  const title = isDirect ? (peer?.name ?? "Диалог") : (chat.name ?? "Группа");
  const avatarSrc = isDirect ? peer?.image : chat.imageUrl;
  const online = isDirect ? Boolean(peer?.isOnline) : false;
  const subtitle = isDirect
    ? peer?.isOnline
      ? "В сети"
      : "Не в сети"
    : `${chat.members.length} участников`;

  return (
    <button
      type="button"
      onClick={() => (isDirect ? onOpenProfile() : onOpenGroup())}
      className="flex w-full items-center gap-3 border-b px-4 py-3 text-left bg-white hover:bg-muted/90"
    >
      <AvatarWithStatus isOnline={online}>
        <Avatar>
          {avatarSrc ? <AvatarImage src={avatarSrc} /> : null}
          <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </AvatarWithStatus>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-1 text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}
