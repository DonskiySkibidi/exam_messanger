"use client";

import { userApi } from "@/src/shared/api";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/src/features/chat/api";

export function useUserSearch(searchValue: string, enabled: boolean) {
  const debounced = useDebounce(searchValue.trim(), 300);
  return useQuery({
    queryKey: ["users", "search", debounced],
    queryFn: () => userApi.searchUsers(debounced, 20),
    enabled: enabled,
    // && debounced.length > 0
    staleTime: 30_000,
  });
}
