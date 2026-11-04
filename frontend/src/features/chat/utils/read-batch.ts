export interface VisibleCandidate {
  id: string;
  /** ISO-дата создания. */
  createdAt: string;
  senderId: string;
}

export interface ReadableBatch {
  upToId: string;
  upToCreatedAt: string;
}

/**
 * Чистый отбор батча на прочтение из видимых элементов.
 * - Свои сообщения — никогда (автор не «читает» своё).
 * - Только строго новее уже подтверждённого водяного знака.
 * - Возвращает максимум одним вызовом (watermark монотонен).
 * Повторный вызов с тем же входом после подтверждения даёт null.
 */
export function selectReadableBatch(
  visible: VisibleCandidate[],
  currentUserId: string,
  confirmedMaxIso: string | null,
): ReadableBatch | null {
  const confirmed = confirmedMaxIso ? new Date(confirmedMaxIso).getTime() : 0;

  let best: ReadableBatch | null = null;
  let bestTime = Number.isNaN(confirmed) ? 0 : confirmed;

  for (const candidate of visible) {
    if (candidate.senderId === currentUserId) continue;
    const time = new Date(candidate.createdAt).getTime();
    if (Number.isNaN(time) || time <= bestTime) continue;
    bestTime = time;
    best = { upToId: candidate.id, upToCreatedAt: candidate.createdAt };
  }

  return best;
}
