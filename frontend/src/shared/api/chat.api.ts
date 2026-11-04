import { api } from "@/src/shared/api";
import type { IChat } from "@/src/shared/types";
import type {
  ISendDirectMessagePayload,
  ISendMessagePayload,
  IMessage,
} from "@/src/shared/types";

export interface ICreateGroupPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  memberIds: string[];
}

export interface MarkReadResult {
  lastReadAt: string;
  advanced: boolean;
  unreadCount: number;
}

export interface IDirectResult {
  message: IMessage;
  chat: IChat;
  created: boolean;
}

class ChatApi {
  getMyChats() {
    return api.get<IChat[]>("chats");
  }

  getMessages(chatId: string, take = 75, cursor?: string) {
    const params = new URLSearchParams({ take: String(take) });
    if (cursor) params.set("cursor", cursor);
    return api.get<IMessage[]>(`chats/${chatId}/messages?${params.toString()}`);
  }

  sendMessage(body: ISendMessagePayload) {
    return api.post<IMessage>(
      "chats/messages",
      body as unknown as Record<string, string>,
    );
  }

  sendDirectMessage(body: ISendDirectMessagePayload) {
    return api.post<IDirectResult>(
      "chats/direct/messages",
      body as unknown as Record<string, string>,
    );
  }

  getOrCreateDirect(recipientId: string) {
    return api.post<{ chat: IChat; created: boolean }>(
      `chats/direct/${recipientId}`,
    );
  }

  createGroup(body: ICreateGroupPayload) {
    return api.post<{ chat: IChat; created: boolean }>(
      "chats/group",
      body as unknown as Record<string, string>,
    );
  }

  markRead(chatId: string, upToMessageId?: string) {
    return api.post<MarkReadResult>(
      `chats/${chatId}/read`,
      { ...(upToMessageId ? { upToMessageId } : {}) } as Record<string, string>,
    );
  }

  updateGroup(
    chatId: string,
    body: { name?: string; description?: string | null; imageUrl?: string | null },
  ) {
    return api.patch<IChat>(
      `chats/${chatId}`,
      body as unknown as Record<string, string>,
    );
  }

  addMembers(chatId: string, memberIds: string[]) {
    return api.post<{ addedIds: string[]; chat: IChat }>(
      `chats/${chatId}/members`,
      { memberIds } as unknown as Record<string, string>,
    );
  }

  removeMember(chatId: string, userId: string) {
    return api.delete<{ deleted: boolean; chat?: IChat }>(
      `chats/${chatId}/members/${userId}`,
    );
  }

  leaveChat(chatId: string) {
    return api.post<{ deleted: boolean }>(`chats/${chatId}/leave`);
  }
}

export const chatApi = new ChatApi();