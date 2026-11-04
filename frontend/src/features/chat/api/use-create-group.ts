"use client";

import { chatApi, type ICreateGroupPayload } from "@/src/shared/api";
import { emitWithAck } from "@/src/features/chat/utils";
import { CHATS_QUERY_KEY } from "@/src/features/chat/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** Создание группы: WS-first (single-write), fallback REST при отсутствии ack. */
export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ICreateGroupPayload) => {
      try {
        return await emitWithAck<{ id: string }>(
          "createGroupChat",
          body,
          (r): r is { id: string } =>
            !!r && typeof r === "object" && typeof (r as { id: unknown }).id === "string",
        );
      } catch {
        const result = await chatApi.createGroup(body);
        return result.chat;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });
    },
  });
}
