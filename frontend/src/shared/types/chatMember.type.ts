import type { Department } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";

export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export interface IChatMember {
  id: string;
  role: MemberRole;
  joinedAt: string;
  lastReadAt: string;

  userId: string;
  user: Pick<
    IUser,
    "id" | "name" | "image" | "isOnline" | "email"
  > & {
    department: Department | null;
    bio: string | null;
  };

  chatId: string;
}
