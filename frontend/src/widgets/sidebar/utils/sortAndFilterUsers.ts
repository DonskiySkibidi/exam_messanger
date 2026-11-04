import type { IUser } from "@/src/shared/types";

type Params = {
  users: IUser[];
  searchValue: string;
};

/**
 * Фильтр по имени/email (includes, case-insensitive) + группировка по отделу.
 * Пустой запрос → все пользователи, отсортированные по онлайну и имени.
 */
export function sortAndFilterUsers({ users, searchValue }: Params) {
  const q = searchValue.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : [...users];

  filtered.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const grouped: Record<string, IUser[]> = {};
  for (const user of filtered) {
    const key = user.department ?? "OTHER";
    (grouped[key] ??= []).push(user);
  }
  return grouped;
}
