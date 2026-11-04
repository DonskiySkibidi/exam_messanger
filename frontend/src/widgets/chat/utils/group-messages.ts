import type { IMessage } from "@/src/shared/types";
import type { IMessageGroup } from "@/src/widgets/chat/types";

/**
 * Группирует сообщения в хронологическом порядке: подряд идущие сообщения
 * одного отправителя (с разрывом не больше maxGapMs) — одна группа.
 * Используется лентой GROUP-чатов: первое сообщение группы показывает имя,
 * последнее — аватар отправителя.
 */
export function groupConsecutiveMessages(
  messages: IMessage[],
  maxGapMs = 5 * 60 * 1000,
): IMessageGroup[] {
  const groups: IMessageGroup[] = [];

  for (const message of messages) {
    const current = groups[groups.length - 1];
    const gap =
      current && current.messages.length > 0
        ? new Date(message.createdAt).getTime() -
          new Date(
            current.messages[current.messages.length - 1]?.createdAt ?? message.createdAt,
          ).getTime()
        : Number.POSITIVE_INFINITY;

    if (current && current.senderId === message.senderId && gap <= maxGapMs) {
      current.messages.push(message);
    } else {
      groups.push({
        key: `${message.senderId}-${message.id}`,
        senderId: message.senderId,
        senderName: message.sender?.name ?? "Пользователь",
        senderImage: message.sender?.image,
        messages: [message],
      });
    }
  }

  return groups;
}
