import type { IChat } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";

/**
 * Маппинг участника чата в профиль для UserProfileDialog.
 * Единая версия (раньше дублировалась в group-info-sheet и странице чата).
 */
export function toProfileUser(member: IChat["members"][number]): IUser {
  return {
    id: member.user.id,
    name: member.user.name,
    email: member.user.email ?? "",
    image: member.user.image,
    bio: member.user.bio ?? null,
    department: member.user.department ?? null,
    role: "USER" as never,
    isOnline: member.user.isOnline,
    createdAt: "",
    updatedAt: "",
  };
}
