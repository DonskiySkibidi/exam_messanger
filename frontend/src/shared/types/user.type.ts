import { IChatMember } from "@/src/shared/types";
import { Department } from "@/src/shared/types";

export enum GlobalRole {
  ADMIN = "ADMIN",
  USER = "USER",
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  bio?: string | null;
  role: GlobalRole;
  department?: Department | null;
  isOnline: boolean;

  createdAt: string;
  updatedAt: string;

  chats?: IChatMember[];
}

export interface IAccount {
  id: string;
  type: string;
  provider: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/** Whitelist обновления профиля (mirror backend UpdateProfileDto). */
export interface IUpdateProfilePayload {
  name?: string;
  avatar?: string;
  bio?: string;
  department?: Department | null;
}
