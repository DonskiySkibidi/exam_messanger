"use client";

import { useProfile } from "@/src/features/chat/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from "@/src/shared/components";
import { resolveFileUrl } from "@/src/shared/lib";
import { initials } from "@/src/shared/utils";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import { ProfileEditForm } from "@/src/features/chat/ui";

interface IProfileSettingPops {
  onBack: () => void;
}
/**
 * Панель «Настройки»: просмотр профиля + форма редактирования
 * (только name / avatar / bio / department).
 */
export function ProfileSettings({ onBack }: IProfileSettingPops) {
  const { data: profile, isPending } = useProfile();
  const [editing, setEditing] = useState(false);

  if (isPending || !profile)
    return <div className="p-4 text-sm">Загрузка…</div>;

  return (
    <div className="flex w-full flex-col gap-4 px-2 ">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Назад"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-base font-semibold">Настройки</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Редактировать профиль"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil size={16} />
        </Button>
      </div>

      {!editing ? (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              {profile.image ? (
                <AvatarImage src={resolveFileUrl(profile.image)} />
              ) : null}
              <AvatarFallback>{initials(profile.name)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="line-clamp-1 font-medium">{profile.name}</span>
              <span className="line-clamp-1 text-xs text-muted-foreground">
                {profile.email}
              </span>
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            {profile.email}
          </div>
          {profile.bio ? (
            <div>
              <span className="text-muted-foreground">О себе: </span>
              {profile.bio}
            </div>
          ) : null}
          {profile.department ? (
            <div>
              <span className="text-muted-foreground">Отдел: </span>
              {profile.department}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">Роль: </span>
            {profile.role}
          </div>
        </div>
      ) : (
        <ProfileEditForm profile={profile} onSaved={() => setEditing(false)} />
      )}
    </div>
  );
}
