import { api } from "@/src/shared/api";
import { getServerBaseUrl } from "@/src/shared/lib";
import type { IAttachment } from "@/src/shared/types";
import { toastMessageHandler } from "@/src/shared/utils";

export interface IUploadedFile {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

class FileApi {
  async uploadFiles(files: File[]): Promise<IUploadedFile[]> {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    const base = getServerBaseUrl();
    const res = await fetch(`${base}/file/create`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      const error = Error(err?.message ?? `Upload failed: ${res.status}`);
      toastMessageHandler(error);
      // Раньше здесь был только тост, а выполнение шло дальше и res.json()
      // с телом ошибки возвращался как «файлы» → сообщение уходило без фото.
      throw error;
    }
    return (await res.json()) as IUploadedFile[];
  }
}

export const fileApi = new FileApi();
export type { IAttachment };
