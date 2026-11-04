import type { IMessage } from "@/src/shared/types";

/**
 * Группа подряд идущих сообщений одного отправителя (для MessageGroup:
 * первое показывает имя, последнее — аватар).
 */
export interface IMessageGroup {
  /** Стабильный ключ: отправитель + id первого сообщения. */
  key: string;
  senderId: string;
  senderName: string;
  senderImage?: string | null;
  messages: IMessage[];
}
