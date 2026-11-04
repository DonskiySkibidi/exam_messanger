/** Вложение, ожидающее отправки (превью в поле ввода). */
export interface IPendingAttachment {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl?: string;
}
