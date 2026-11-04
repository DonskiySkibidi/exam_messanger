"use client";

import { useLeaveChat, useProfile } from "@/src/features/chat/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/shared/components";
import { resolveFileUrl } from "@/src/shared/lib";
import type { IChat } from "@/src/shared/types";
import { MemberRole } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";
import { toastMessageHandler } from "@/src/shared/utils";
import { AddMembers } from "@/src/features/chat/ui";
import { Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { GroupEditForm } from "@/src/features/chat/ui";
import { GroupMembers } from "@/src/features/chat/ui";

interface GroupInfoSheetProps {
  chat: IChat | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: IUser) => void;
  onLeftChat?: (chatId: string) => void;
}

/**
 * Sheet GROUP-чата: шапка + редактирование (только chat ADMIN) +
 * участники с ContextMenu + добавление + выход.
 * Части: GroupEditForm, GroupMembers, AddMembers.
 */
export function GroupInfoSheet({
  chat,
  open,
  onOpenChange,
  onSelectUser,
  onLeftChat,
}: GroupInfoSheetProps) {
  const { data: profile } = useProfile();
  const currentUserId = profile?.id ?? "";
  const myRole = chat?.members.find((m) => m.userId === currentUserId)?.role;
  const canManage = myRole === MemberRole.ADMIN;

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const leaveChat = useLeaveChat();

  useEffect(() => {
    if (chat && open) {
      setEditing(false);
      setAdding(false);
    }
  }, [chat?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Меня исключили / я вышел: закрыть шит, страницу редиректит use-chats.
  useEffect(() => {
    if (open && !chat) onOpenChange(false);
  }, [open, chat, onOpenChange]);

  if (!chat) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {chat.imageUrl ? (
                <AvatarImage src={resolveFileUrl(chat.imageUrl)} />
              ) : null}
              <AvatarFallback>
                {(chat.name ?? "Г").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="line-clamp-1">
                {chat.name ?? "Группа"}
              </SheetTitle>
              <SheetDescription>
                {chat.description ?? `${chat.members.length} участников`}
              </SheetDescription>
            </div>
          </div>

          {canManage ? (
            <Button
              type="button"
              className={"flex w-full"}
              variant="default"
              size="icon-sm"
              aria-label="Редактировать группу"
              onClick={() => setEditing((v) => !v)}
            >
              {/* <Pencil size={16} /> */}
              {editing ? "Отменить" : "Редактировать"}
            </Button>
          ) : null}
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {editing && canManage ? (
            <GroupEditForm
              chatId={chat.id}
              initialName={chat.name ?? ""}
              initialDescription={chat.description ?? ""}
              onSaved={() => setEditing(false)}
            />
          ) : null}

          <GroupMembers
            chatId={chat.id}
            members={chat.members}
            currentUserId={currentUserId}
            canManage={canManage}
            onSelectUser={onSelectUser}
          />

          {canManage ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdding((v) => !v)}
              >
                <Plus size={16} /> Добавить участников
              </Button>
              {adding ? (
                <AddMembers
                  chatId={chat.id}
                  existingIds={chat.members.map((m) => m.userId)}
                  onAdded={() => setAdding(false)}
                />
              ) : null}
            </div>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={leaveChat.isPending}
            onClick={() =>
              leaveChat.mutate(chat.id, {
                onSuccess: () => onLeftChat?.(chat.id),
                onError: (e) =>
                  toastMessageHandler(
                    e instanceof Error ? e : Error(String(e)),
                  ),
              })
            }
          >
            Покинуть чат
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
