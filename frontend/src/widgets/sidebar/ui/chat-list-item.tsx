"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
  Badge,
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/src/shared/components";
import { ChatType, type IChat } from "@/src/shared/types";
import Link from "next/link";

interface IProps {
  chat: IChat;
  currentUserId: string;
  active: boolean;
}

function chatTitle(chat: IChat, currentUserId: string): string {
  if (chat.type === ChatType.GROUP) return chat.name ?? "Группа";
  const peer = chat.members.find((m) => m.userId !== currentUserId)?.user;
  return peer?.name ?? "Диалог";
}

function chatAvatar(chat: IChat, currentUserId: string): string | undefined {
  if (chat.type === ChatType.GROUP) return chat.imageUrl ?? undefined;
  const peer = chat.members.find((m) => m.userId !== currentUserId)?.user;
  return peer?.image ?? undefined;
}

function peerOnline(chat: IChat, currentUserId: string): boolean {
  if (chat.type !== ChatType.DIRECT) return false;
  return Boolean(
    chat.members.find((m) => m.userId !== currentUserId)?.user.isOnline,
  );
}

/** Строка чата: превью lastMessage + Badge непрочитанных. */
export function ChatListItem({ chat, currentUserId, active }: IProps) {
  const title = chatTitle(chat, currentUserId);
  const avatar = chatAvatar(chat, currentUserId);
  const online = peerOnline(chat, currentUserId);
  const unread = chat.unreadCount ?? 0;

  return (
    <Item variant={active ? "muted" : "outline"} className="w-full">
      <Link
        href={`/dashboard/${chat.id}`}
        className="flex w-full items-center gap-2.5"
      >
        <ItemMedia variant="image">
          <AvatarWithStatus isOnline={online}>
            <Avatar>
              {avatar ? <AvatarImage src={avatar} /> : null}
              <AvatarFallback>{title.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </AvatarWithStatus>
        </ItemMedia>
        <ItemContent className="min-w-0 flex-1">
          <ItemTitle className="line-clamp-1">{title}</ItemTitle>
          <ItemDescription className="line-clamp-1">
            {chat.lastMessage?.content ??
              (chat.lastMessage ? "Вложение" : "Нет сообщений")}
          </ItemDescription>
        </ItemContent>
        {unread > 0 ? <Badge>{unread > 99 ? "99+" : unread}</Badge> : null}
      </Link>
    </Item>
  );
}
