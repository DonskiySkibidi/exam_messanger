"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/shared/components";
import type { IUser } from "@/src/shared/types";

interface IProps {
  user: Pick<
    IUser,
    "id" | "name" | "image" | "bio" | "department" | "email" | "isOnline"
  > | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog профиля: используется для DIRECT-собеседника и участников группы. */
export function UserProfileDialog({ user, open, onOpenChange }: IProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {!user ? null : (
          <>
            {/* <DialogHeader>
              <DialogTitle className="line-clamp-1">{user.name}</DialogTitle>
              <DialogDescription>{user.email ?? ""}</DialogDescription>
            </DialogHeader> */}
            <div className="flex items-center gap-3">
              <AvatarWithStatus isOnline={user.isOnline} size="lg">
                <Avatar size="lg">
                  {user.image ? <AvatarImage src={user.image} /> : null}
                  <AvatarFallback>
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </AvatarWithStatus>
              <div className="flex flex-col gap-1 text-sm">
                <h1 className="text-[16px] font-semibold">{user.name}</h1>
                <span className="text-muted-foreground">
                  {user.isOnline ? "В сети" : "Не в сети"}
                </span>
              </div>
            </div>
            <span>Отдел: {`${user.department ? user.department : "Не указан"}`}</span> 
            <p className="text-sm">{`О себе: ${user.bio ? user.bio : "Отсутствует"}`}</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
