import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  imageUrl: z
    .string()
    .trim()
    .url("Некорректный URL")
    .optional()
    .or(z.literal("")),
  memberIds: z.array(z.string()).min(1, "Выберите участников").max(100),
});

export type GroupFormValues = z.infer<typeof groupSchema>;
