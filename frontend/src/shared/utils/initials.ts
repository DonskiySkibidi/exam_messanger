/**
 * Инициалы для AvatarFallback: первые буквы первых двух слов.
 * Единая версия (раньше дублировалась в message-item и profile-settings).
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
