import { toast } from "@/src/shared/components";

const toastTimeOut = 5000; // 5 seconds

export function toastMessageHandler(error: Error) {
  if (error.message) {
    const errorMessage = error.message;
    const firstDotIndex = errorMessage.indexOf(".");

    if (firstDotIndex !== -1) {
      toast.add({
        type: "error",
        title: errorMessage.slice(0, firstDotIndex),
        description: errorMessage.slice(firstDotIndex + 1),
        timeout: toastTimeOut,
      });
    } else {
      toast.add({
        type: "error",
        title: "Ошибка",
        description: errorMessage,
        timeout: toastTimeOut,
      });
    }
  } else {
    toast.add({
      type: "error",
      title: "Ошибка",
      description: "Ошибка со стороны сервера",
      timeout: toastTimeOut,
    });
  }
}
