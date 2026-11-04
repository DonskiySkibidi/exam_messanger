import { getSocket } from "@/src/shared/lib";

/**
 * WS-emit с ack как Promise (single-write).
 * КРИТИЧНО: ack вызывается и при серверной ошибке, поэтому ответ
 * проверяется валидатором isOk — иначе ошибка маскируется под успех.
 * Единая версия (раньше дублировалась в use-messages и use-create-group).
 */
export function emitWithAck<T>(
  event: string,
  payload: unknown,
  isOk: (response: unknown) => response is T = (r): r is T => !!r,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timer = setTimeout(() => reject(new Error("Socket timeout")), 15_000);
    s.emit(event, payload, (response: unknown) => {
      clearTimeout(timer);
      if (isOk(response)) {
        resolve(response);
      } else {
        const message =
          response &&
          typeof response === "object" &&
          "message" in response &&
          typeof (response as { message: unknown }).message === "string"
            ? (response as { message: string }).message
            : `Сервер отклонил событие ${event}`;
        reject(new Error(message));
      }
    });
  });
}
