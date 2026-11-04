"use client";

import {
  GroupInfoSheet,
  PAGE_SIZE,
  UserProfileDialog,
  useChatMessages,
  useChats,
  useProfile,
  useSendDirectMessage,
  useSendMessage,
} from "@/src/features/chat";
import { toProfileUser } from "@/src/features/chat/utils";
import { ChatType, type IUser } from "@/src/shared/types";
import { useActivityStore } from "@/src/shared/stores";
import {
  ChatHeader,
  MediaCarouselModal,
  MessageInput,
  MessageList,
} from "@/src/widgets/chat";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * app/dashboard/[chatId]: шапка (Dialog/Sheet), лента (75/infinite),
 * разделитель непрочитанных, автоскролл своих, ввод с файлами.
 */
export default function ChatPage() {
  const params = useParams<{ chatId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatId = params.chatId;
  const isNew = chatId === "new";
  const recipientId = searchParams.get("userId") ?? undefined;

  const { data: profile } = useProfile();
  const currentUserId = profile?.id ?? "";
  const { data: chats = [], isLoading: chatsLoading } = useChats();
  const chat = chats.find((c) => c.id === chatId);

  // Меня исключили / чат удалён: уходим из несуществующего треда.
  useEffect(() => {
    if (!isNew && !chatsLoading && !chat) {
      router.replace("/dashboard");
    }
  }, [isNew, chatsLoading, chat, router]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useChatMessages(isNew ? "" : chatId);

  const sendMessage = useSendMessage(chatId);
  const sendDirect = useSendDirectMessage();

  // Активности из глобального стора (Escape закрывает их по иерархии).
  const infoPanel = useActivityStore((s) => s.infoPanel);
  const openGroupPanel = useActivityStore((s) => s.openGroupPanel);
  const openUserPanel = useActivityStore((s) => s.openUserPanel);
  const closeInfoPanel = useActivityStore((s) => s.closeInfoPanel);
  const viewer = useActivityStore((s) => s.viewer);
  const closeViewer = useActivityStore((s) => s.closeViewer);
  const [bottomSignal, setBottomSignal] = useState(0);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  // URL — источник истины открытого чата; дублируем в стор для
  // Escape-навигации и восстановления после F5.
  useEffect(() => {
    if (isNew) return;
    useActivityStore.getState().setActiveChat(chatId);
  }, [chatId, isNew]);

  const profileUser: IUser | null =
    infoPanel?.kind === "user" ? infoPanel.user : null;
  const groupOpen = infoPanel?.kind === "group";

  const pages = data?.pages;
  const chronological = useMemo(
    () => [...(pages ?? []).flat()].reverse(),
    [pages],
  );

  // Первое непрочитанное: хвост из unreadCount сообщений.
  const firstUnreadId = useMemo(() => {
    const unread = chat?.unreadCount ?? 0;
    if (!unread || chronological.length === 0) return null;
    const idx = Math.max(chronological.length - unread, 0);
    const msg = chronological[idx];
    // Свои сообщения разделителем не помечаем.
    if (msg && msg.senderId !== currentUserId) return msg.id;
    return null;
  }, [chat?.unreadCount, chronological, currentUserId]);

  // Автоскролл при своём новом сообщении.
  const lastId = chronological[chronological.length - 1]?.id;
  const lastSender = chronological[chronological.length - 1]?.senderId;
  useEffect(() => {
    if (lastSender === currentUserId && lastId) {
      setBottomSignal((s) => s + 1);
    }
  }, [lastId, lastSender, currentUserId]);

  useEffect(() => {
    if (bottomSignal > 0) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [bottomSignal]);

  const peerMember =
    chat?.type === ChatType.DIRECT
      ? chat.members.find((m) => m.userId !== currentUserId)
      : undefined;

  if (isNew) {
    return (
      <div className="flex h-full flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">
          <div className="p-6 text-sm text-muted-foreground">
            Новый диалог. Напишите первое сообщение...
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
          <MessageInput
            disabled={!recipientId || sendDirect.isPending}
            onSend={(content, attachments) => {
              if (!recipientId) return;
              sendDirect.mutate(
                { recipientId, content },
                {
                  onSuccess: (result) => {
                    const id = (result as unknown as { chat: { id: string } })
                      .chat.id;
                    router.push(`/dashboard/${id}`);
                  },
                },
              );
              void attachments;
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {chat ? (
        <ChatHeader
          chat={chat}
          currentUserId={currentUserId}
          onOpenProfile={() => {
            if (peerMember) openUserPanel(toProfileUser(peerMember));
          }}
          onOpenGroup={() => openGroupPanel()}
        />
      ) : null}

      <div className="min-h-0 w-full flex-1">
        {isPending ? (
          <p className="mx-auto w-full max-w-3xl p-6 text-sm text-muted-foreground">
            Загрузка сообщений…
          </p>
        ) : (
          <MessageList
            chatId={chatId}
            pages={pages}
            currentUserId={currentUserId}
            members={chat?.members ?? []}
            chatType={chat?.type ?? ChatType.DIRECT}
            unreadCount={chat?.unreadCount ?? 0}
            isGroup={chat?.type === ChatType.GROUP}
            firstUnreadId={firstUnreadId}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            fetchNextPage={() => void fetchNextPage()}
          />
        )}
        <div ref={bottomAnchorRef} aria-hidden />
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
        <MessageInput
          disabled={sendMessage.isPending}
          onSend={(content, attachments) => {
            sendMessage.mutate({ content, attachments });
            setBottomSignal((s) => s + 1);
          }}
        />
      </div>

      <UserProfileDialog
        user={profileUser}
        open={profileUser !== null}
        onOpenChange={(open) => {
          if (!open) closeInfoPanel();
        }}
      />
      <GroupInfoSheet
        chat={chat}
        open={groupOpen}
        onOpenChange={(open) => {
          if (!open) closeInfoPanel();
        }}
        onSelectUser={(user) => {
          openUserPanel(user);
        }}
      />
      {viewer ? (
        <MediaCarouselModal
          key={viewer.key}
          attachments={viewer.attachments}
          initialIndex={viewer.index}
          open
          onOpenChange={(open) => {
            if (!open) closeViewer();
          }}
        />
      ) : null}
      <span className="hidden">{PAGE_SIZE}</span>
    </div>
  );
}
