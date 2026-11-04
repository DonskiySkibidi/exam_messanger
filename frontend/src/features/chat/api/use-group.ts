"use client";

import { chatApi } from "@/src/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CHATS_QUERY_KEY } from "@/src/features/chat/api";

/**
 * Управление GROUP-чатом (REST; пуши chat:updated/chat:removed/preview
 * прилетают по `notifications`, поэтому инвалидация — страховка).
 */
export function useUpdateGroup(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      description?: string | null;
      imageUrl?: string | null;
    }) => chatApi.updateGroup(chatId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });
    },
  });
}

export function useAddMembers(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => chatApi.addMembers(chatId, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });
    },
  });
}

export function useRemoveMember(chatId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => chatApi.removeMember(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });
    },
  });
}

export function useLeaveChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => chatApi.leaveChat(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY });
    },
  });
}
