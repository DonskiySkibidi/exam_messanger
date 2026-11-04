"use client";
import { useMutation } from "@tanstack/react-query";
import { authService, type TypeLoginSchema } from "@/src/features/auth";
import { toastMessageHandler } from "@/src/shared/utils";
import { toast } from "@/src/shared/components";
import { useRouter } from "next/navigation";

export function useLoginMutation() {
  const router = useRouter();
  const { mutate: login, isPending: isLoadingLogin } = useMutation({
    mutationKey: ["login user"],
    mutationFn: ({ values }: { values: TypeLoginSchema }) =>
      authService.login(values),
    onSuccess() {
      toast.add({
        type: "success",
        title: "Успешно",
        description: "Успешная авторизация",
      });
      router.push("/dashboard");
    },
    onError(error) {
      toastMessageHandler(error);
    },
  });
  return { login, isLoadingLogin };
}
