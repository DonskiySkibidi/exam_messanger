"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Bubble,
  BubbleContent,
  BubbleReactions,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/src/shared/components";
import type { IAttachment, IMessage } from "@/src/shared/types";
import { IMessageKind } from "@/src/shared/types";
import type { ReadState } from "@/src/features/chat/types";
import { buildDownloadUrl, resolveFileUrl } from "@/src/shared/lib";
import { useActivityStore } from "@/src/shared/stores";
import { initials } from "@/src/shared/utils";
import { Check, CheckCheck, FileIcon } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

interface IProps {
  message: IMessage;
  isOwn: boolean;
  /**
   * Флаги от MessageList (только для чужих сообщений в GROUP-чатах):
   * showName — первое сообщение группы (MessageHeader с именем),
   * withAvatarSlot — слот MessageAvatar (видимый аватар только при showAvatar).
   */
  showName?: boolean;
  withAvatarSlot?: boolean;
  showAvatar?: boolean;
  /**
   * Серверное состояние прочтения СОБСТВЕННОГО сообщения
   * (computeReadState по водяным знакам). null — тики не рисуем
   * (входящие и системные сообщения).
   */
  readState?: ReadState | null;
}

function isImage(a: IAttachment) {
  return a.mimeType.startsWith("image/");
}

/** Одно сообщение: текст + сетка медиа (next/image) + карусель по клику. */
export function MessageItem({
  message,
  isOwn,
  showName = false,
  withAvatarSlot = false,
  showAvatar = false,
  readState = null,
}: IProps) {
  const openViewer = useActivityStore((s) => s.openViewer);
  const images = message.attachments.filter(isImage);
  const files = message.attachments.filter((a) => !isImage(a));
  const senderName = message.sender?.name ?? "Пользователь";
  const senderImage = message.sender?.image;
  const tempHrefBody = useRef<null | HTMLDivElement>(null);
  const tempDownloadLink = useRef<null | HTMLLinkElement>(null);

  // Системное событие треда (join/remove): центрированная плашка без бабла.
  // data-атрибуты нужны наблюдателю видимости: системное событие тоже
  // двигает водяной знак, если реально показано.
  if (message.kind === IMessageKind.SYSTEM) {
    return (
      <div
        className="flex justify-center py-1"
        data-message-id={message.id}
        data-created-at={message.createdAt}
        data-sender-id={message.senderId}
      >
        <span className="max-w-full rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
          {message.content ?? ""}
        </span>
      </div>
    );
  }

  return (
    <div ref={tempHrefBody}>
      <Message
        className="mb-3"
        align={isOwn ? "end" : "start"}
        data-message-id={message.id}
        data-created-at={message.createdAt}
        data-sender-id={message.senderId}
      >
        {withAvatarSlot ? (
          <MessageAvatar>
            {showAvatar ? (
              <Avatar>
                {senderImage ? <AvatarImage src={senderImage} /> : null}
                <AvatarFallback>{initials(senderName)}</AvatarFallback>
              </Avatar>
            ) : null}
          </MessageAvatar>
        ) : null}
        <MessageContent>
          {showName ? <MessageHeader>{senderName}</MessageHeader> : null}
          <Bubble
            variant={isOwn ? "default" : "secondary"}
            align={isOwn ? "end" : "start"}
          >
            {message.content ? (
              <BubbleContent className="whitespace-pre-wrap">
                {message.content}
              </BubbleContent>
            ) : null}
            {images.length > 0 ? (
              <div
                className={
                  images.length === 1 ? "w-64" : "grid w-72 grid-cols-2 gap-1.5"
                }
              >
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => openViewer(images, i)}
                    className="relative aspect-square w-full overflow-hidden rounded-lg"
                    aria-label={`Открыть ${img.fileName}`}
                  >
                    <Image
                      src={resolveFileUrl(img.url)}
                      alt={img.fileName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 300px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            {files.length > 0 ? (
              <div className="flex flex-col gap-1">
                {files.map((f) => {
                  const href = buildDownloadUrl(f.url, f.fileName);
                  return (
                    <button
                      onClick={() => {
                        const x = document.createElement("a");
                        x.href = href;
                        x.download = "true";
                        x.target = "_self";
                        x.rel = "noreferrer";
                        if (tempHrefBody) {
                          tempHrefBody.current?.append(x);
                          x.click();
                          tempHrefBody.current?.removeChild(x);
                        }
                      }}
                      key={f.id}
                      // href={href}
                      // target={"_self"}
                      // download={f.fileName}
                      // rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs underline-offset-2 hover:bg-accent/30 cursor-pointer"
                    >
                      <FileIcon size={16} className="shrink-0" />
                      <span className="line-clamp-1">{f.fileName}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Bubble>
          {readState ? <ReadTicks state={readState} /> : null}
        </MessageContent>
      </Message>
    </div>
  );
}

/**
 * Презентация серверного состояния прочтения в MessageFooter.
 * Только свои сообщения (readState уже null для входящих).
 * Доставки (DELIVERED) сервер достоверно не определяет — отдельной
 * иконки нет: отправлено (Check) vs прочитано (CheckCheck).
 */
function ReadTicks({ state }: { state: ReadState }) {
  if (state.level === "sent") {
    return (
      <BubbleReactions>
        <Check
          size={14}
          className="text-muted-foreground"
          aria-label="Отправлено"
        />
      </BubbleReactions>
    );
  }
  const fullyRead = state.level === "read" || state.level === "read-all";
  const title =
    state.level === "read-some"
      ? `Прочитали: ${state.readBy.slice(0, 3).join(", ")}`
      : state.level === "read-all"
        ? "Прочитали все"
        : "Прочитано";
  return (
    <BubbleReactions>
      <CheckCheck
        size={14}
        className={fullyRead ? "text-sky-500" : "text-muted-foreground"}
        aria-label={title}
      />
      <span className="sr-only">{title}</span>
    </BubbleReactions>
  );
}
