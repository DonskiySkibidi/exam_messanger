"use client";

import { userApi } from "@/src/shared/api";
import type { IUpdateProfilePayload } from "@/src/shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const PROFILE_QUERY_KEY = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => userApi.getProfile(),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: IUpdateProfilePayload) => userApi.updateProfile(body),
    onSuccess: (user) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, user);
    },
  });
}
