"use client";

import { fileApi } from "@/src/shared/api";
import { resolveFileUrl } from "@/src/shared/lib";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  Button,
  Textarea,
} from "@/src/shared/components";
import type { IPendingAttachment } from "@/src/widgets/chat/types";
import { FileIcon, Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

interface IProps {
  disabled?: boolean;
  onSend: (content: string, attachments: IPendingAttachment[]) => void;
}

/**
 * Input area: Textarea resize-none + autorost до 200px (дальше внутренний скролл),
 * прикрепление файлов, превью Attachment с удалением, Enter=отправка.
 */
export function MessageInput({ disabled, onSend }: IProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<IPendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const autosize = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await fileApi.uploadFiles([...files]);
      setPending((prev) => [
        ...prev,
        ...uploaded.map((u) => ({
          ...u,
          previewUrl: u.mimeType.startsWith("image/") ? u.url : undefined,
        })),
      ]);
    } finally {
      setUploading(false);
    }
  };

  const send = () => {
    const content = value.trim();
    if ((!content && pending.length === 0) || disabled || uploading) return;
    onSend(content, pending);
    setValue("");
    setPending([]);
    requestAnimationFrame(autosize);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      {pending.length > 0 ? (
        <AttachmentGroup>
          {pending.map((file, i) => (
            <Attachment
              key={`${file.url}-${i}`}
              orientation="vertical"
              size="sm"
            >
              <AttachmentMedia variant={file.previewUrl ? "image" : "icon"}>
                {file.previewUrl ? (
                  <Image
                    src={resolveFileUrl(file.previewUrl)}
                    alt={file.fileName}
                    width={64}
                    height={64}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <FileIcon size={20} />
                )}
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{file.fileName}</AttachmentTitle>
                <AttachmentDescription>
                  {(file.fileSize / 1024).toFixed(1)} KB
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label="Удалить файл"
                  onClick={() =>
                    setPending((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <X size={14} />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      ) : null}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Прикрепить файлы"
          disabled={disabled || uploading}
          className="hover:bg-accent hover:text-accent-foreground cursor-pointer shadow-md bg-accent text-accent-foreground"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={18} />
        </Button>
        <Textarea
          ref={areaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autosize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Сообщение…"
          rows={1}
          className="resize-none overflow-y-auto"
          style={{ maxHeight: 200 }}
        />
        <Button
          type="button"
          size="icon-sm"
          aria-label="Отправить"
          className="hover:bg-accent hover:text-accent-foreground cursor-pointer shadow-md bg-accent text-accent-foreground"
          disabled={
            disabled || uploading || (!value.trim() && pending.length === 0)
          }
          onClick={send}
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
