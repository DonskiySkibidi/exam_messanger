"use client";
import { useMutation } from "@tanstack/react-query";
import { authService, type TypeRegisterSchema } from "@/src/features/auth";
import { toastMessageHandler } from "@/src/shared/utils";
import { toast } from "@/src/shared/components";
import { useRouter } from "next/navigation";

export function useRegisterMutation() {
  const router = useRouter();
  const { mutate: register, isPending: isLoadingRegister } = useMutation({
    mutationKey: ["register user"],
    mutationFn: ({ values }: { values: TypeRegisterSchema }) =>
      authService.register(values),
    onSuccess() {
      toast.add({
        type: "success",
        title: "Успешно",
        description: "Успешная регистрация",
      });
      router.push("/dashboard");
    },
    onError(error) {
      toastMessageHandler(error);
    },
  });
  return { register, isLoadingRegister };
}
