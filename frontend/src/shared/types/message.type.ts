import type { IUser } from "@/src/shared/types";

export enum IMessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export enum IMessageKind {
  USER = "USER",
  SYSTEM = "SYSTEM",
}

export interface IMessage {
  id: string;
  content?: string | null;
  /** SYSTEM — служебное событие треда (join/remove), рендерится по центру. */
  kind: IMessageKind;
  status: IMessageStatus;
  createdAt: string;
  updatedAt: string;

  senderId: string;
  sender: Pick<IUser, "id" | "name" | "image">;

  chatId: string;

  attachments: IAttachment[];
}

export interface IAttachment {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;

  messageId: string;
  uploaderId: string;
}

export interface ISendMessagePayload {
  chatId: string;
  content?: string;
  attachments?: Array<{
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export interface ISendDirectMessagePayload {
  recipientId: string;
  content?: string;
  attachments?: ISendMessagePayload["attachments"];
}
