import { IChatMember } from "@/src/shared/types";
import { IMessage } from "@/src/shared/types";

export enum ChatType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
}

export interface IChat {
  id: string;
  type: ChatType;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  directKey?: string | null;
  updatedAt: string;
  createdAt: string;

  lastMessageId: string | null;
  lastMessage?: IMessage | null;

  messages?: IMessage[];
  members: IChatMember[];

  /** Вычисляется бэкендом (getUserChats) для бейджа. */
  unreadCount?: number;
}
