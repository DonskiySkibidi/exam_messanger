"use client";

/**
 * Единая точка сборки URL бэкенда и файлов.
 * Бэкенд хранит/отдаёт ОТНОСИТЕЛЬНЫЙ путь `/static/<file>`,
 * а раздача висит на origin бэкенда (:4000), не фронта (:3000) —
 * поэтому «сырой» url нельзя подставлять в <img>/<a> напрямую.
 */

export function getServerBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SERVER_URL ??
    process.env.SERVER_URL ??
    "http://localhost:4000";
  return base.replace(/\/+$/, "");
}

/**
 * Превращает путь вложения в абсолютный URL для отображения/скачивания.
 * - `http(s)://…`, `blob:…`, `data:…` → как есть (внешние URL, превью до загрузки);
 * - `/static/x` или `static/x` → `<SERVER_URL>/static/x` без двойного слэша
 *   (двойной слэш `//static/…` НЕ матчится ServeStatic-префиксом `/static` → 404).
 */
export function resolveFileUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (/^(data|blob):/.test(url) || /^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return url;
  }
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${getServerBaseUrl()}${path}`;
}

/**
 * Строит URL для СКАЧИВАНИЯ файла (не фото: фото открываются в карусели).
 *
 * Почему не просто href + download-атрибут: MinIO живёт на другом origin
 * (localhost:9000 vs :3000), а атрибут `download` браузеры учитывают
 * только для same-origin ссылок — для кросс-доменных молча игнорируют,
 * и PDF/текст открылись бы прямо в браузере вместо скачивания.
 *
 * Поэтому для S3/MinIO-ссылок добавляем нативный override
 * `response-content-disposition=attachment` — S3 и MinIO подменяют
 * заголовок ответа, и браузер скачивает файл с исходным именем.
 * Для остальных URL (local /static, внешние) возвращается обычный
 * resolveFileUrl — там же в <a> стоит download-атрибут как best-effort.
 */
export function buildDownloadUrl(
  url: string | undefined | null,
  fileName: string | undefined | null,
): string {
  const resolved = resolveFileUrl(url);
  if (!resolved) return "";
  const safeName = sanitizeContentDispositionName(fileName);
  // Только http(s)-ссылки на объектное хранилище понимают override-параметры.
  if (!/^https?:\/\//i.test(resolved) || !safeName) return resolved;
  const separator = resolved.includes("?") ? "&" : "?";
  const disposition = `attachment; filename="${safeName.ascii}"; filename*=UTF-8''${safeName.encoded}`;
  return `${resolved}${separator}response-content-disposition=${encodeURIComponent(disposition)}`;
}

/**
 * Чистит имя для Content-Disposition: без кавычек/переводов строк
 * (инъекция заголовка), ASCII-фолбэк + RFC 5987 для кириллицы.
 */
function sanitizeContentDispositionName(
  fileName: string | undefined | null,
): { ascii: string; encoded: string } | null {
  const base = (fileName ?? "file").replace(/[\u0000-\u001f\u007f"\\]/g, "").slice(0, 150) || "file";
  const ascii = base.replace(/[^\x20-\x7e]/g, "_") || "file";
  return { ascii, encoded: encodeURIComponent(base) };
}
