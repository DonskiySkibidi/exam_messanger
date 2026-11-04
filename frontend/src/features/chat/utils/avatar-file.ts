/** Ограничения изображений — зеркало бэкенда (ALLOWED_MIME_TO_EXT, image/*). */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB, как MAX_FILE_SIZE

/**
 * Проверка файла аватара/изображения группы.
 * Возвращает текст ошибки для тоста или null, если файл годен.
 * Единая версия (раньше дублировалась в profile-settings и group-info-sheet).
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `Недопустимый тип файла ${file.type || "неизвестен"}. Разрешены: JPEG, PNG, GIF, WebP`;
  }
  if (file.size <= 0) {
    return "Выбран пустой файл";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `Файл ${file.name} превышает ${MAX_IMAGE_SIZE / 1024 / 1024} MB`;
  }
  return null;
}

/** Сброс <input type="file"> после ошибки/сохранения. */
export function resetFileInput(
  ref: React.RefObject<HTMLInputElement | null>,
): void {
  if (ref.current) ref.current.value = "";
}
