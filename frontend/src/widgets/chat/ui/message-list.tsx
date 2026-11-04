"use client";

import {
  Marker,
  MarkerContent,
  MessageGroup,
  ScrollArea,
  ScrollBar,
} from "@/src/shared/components";
import { ChatType, type IChatMember, type IMessage } from "@/src/shared/types";
import { computeReadState } from "@/src/features/chat/utils";
import { useJumpToBottom, useReadObserver } from "@/src/features/chat/api";
import { Fragment, useEffect, useMemo, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { groupConsecutiveMessages } from "@/src/widgets/chat/utils";
import { MessageItem } from "@/src/widgets/chat/ui";

interface IProps {
  chatId: string;
  pages: IMessage[][] | undefined;
  currentUserId: string;
  members: IChatMember[];
  chatType: ChatType;
  /** Серверный счётчик для бейджа на кнопке «вниз». */
  unreadCount: number;
  /** true для GROUP-чатов: первое сообщение группы — имя, последнее — аватар. В DIRECT — ничего лишнего. */
  isGroup: boolean;
  firstUnreadId: string | null;
  isFetchingNextPage: boolean;
  hasNextPage: boolean | undefined;
  fetchNextPage: () => void;
}

/**
 * Лента: ScrollArea на всю ширину, контент центрирован (max-w-3xl).
 * Хронология снизу вверх, IntersectionObserver на якоре самого верхнего
 * сообщения. hasNextPage=false → disconnect, стоп запросов.
 * Сообщения одного отправителя подряд объединены в MessageGroup.
 */
export function MessageList({
  chatId,
  pages,
  currentUserId,
  members,
  chatType,
  unreadCount,
  isGroup,
  firstUnreadId,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
}: IProps) {
  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Хост скролла: viewport ScrollArea ищем внутри (root для обоих IO).
  const hostRef = useRef<HTMLDivElement | null>(null);

  const chronological = useMemo(() => {
    const desc = (pages ?? []).flat();
    return [...desc].reverse();
  }, [pages]);

  const ownLastReadAt =
    members.find((m) => m.userId === currentUserId)?.lastReadAt ?? null;

  const names = useMemo(
    () => new Map(members.map((m) => [m.userId, m.user.name])),
    [members],
  );

  // Сигнатура списка: append/prepend/пагинация/ремоунт → пересканирование.
  const revision = useMemo(() => {
    const first = chronological[0]?.id ?? "";
    const last = chronological[chronological.length - 1]?.id ?? "";
    return `${chronological.length}:${first}:${last}`;
  }, [chronological]);

  // Прочтение по фактической видимости (только этот чат).
  useReadObserver({
    chatId,
    currentUserId,
    hostRef,
    ownLastReadAt,
    revision,
  });

  // Кнопка «вниз»: видна, когда низ вне видимости.
  const { showButton, jump } = useJumpToBottom({
    chatId,
    currentUserId,
    hostRef,
    bottomRef,
  });

  const groups = useMemo(
    () => groupConsecutiveMessages(chronological),
    [chronological],
  );

  useEffect(() => {
    if (!hasNextPage) return;
    const el = topAnchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, pages]);

  return (
    <div ref={hostRef} className="relative h-full w-full min-h-0">
      <ScrollArea className="h-full w-full">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <div ref={topAnchorRef} aria-hidden className="h-px w-full" />
          {isFetchingNextPage ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Загрузка истории…
            </p>
          ) : null}
          {groups.map((group) => (
            <MessageGroup key={group.key}>
              {group.messages.map((message, index) => {
                const isOwn = message.senderId === currentUserId;
                const isFirst = index === 0;
                const isLast = index === group.messages.length - 1;
                // Имя/аватар — только чужим в GROUP: своё авторство очевидно.
                // withAvatarSlot держит выравнивание строк группы по аватару.
                const showMeta = isGroup && !isOwn;
                return (
                  <Fragment key={message.id}>
                    {firstUnreadId === message.id ? (
                      <Marker variant="separator" className="my-2">
                        <MarkerContent>Новые сообщения</MarkerContent>
                      </Marker>
                    ) : null}
                    <MessageItem
                      message={message}
                      isOwn={isOwn}
                      showName={showMeta && isFirst}
                      withAvatarSlot={showMeta}
                      showAvatar={showMeta && isLast}
                      readState={computeReadState({
                        currentUserId,
                        isGroup: chatType === ChatType.GROUP,
                        members,
                        isOwn,
                        createdAt: message.createdAt,
                        names,
                      })}
                    />
                  </Fragment>
                );
              })}
            </MessageGroup>
          ))}
          <div ref={bottomRef} aria-hidden className="h-px w-full" />
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      {showButton ? (
        <button
          type="button"
          onClick={jump}
          aria-label="Вниз и отметить прочитанным"
          className="absolute right-5 bottom-5 z-10 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:brightness-110"
        >
          <ChevronDown size={20} />
          {unreadCount > 0 ? (
            <span className="absolute -top-2 -right-2 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 py-px text-[11px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  );
}
