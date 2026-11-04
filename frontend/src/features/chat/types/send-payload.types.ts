/** Пейлоад отправки сообщения (строго по контракту AttachmentInputDto). */
export interface ISendPayload {
  content?: string;
  attachments?: Array<{
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}
