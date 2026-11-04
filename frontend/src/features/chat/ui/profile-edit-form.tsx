"use client";

import { useUpdateProfile } from "@/src/features/chat/api";
import {
  ALLOWED_IMAGE_TYPES,
  resetFileInput,
  validateImageFile,
} from "@/src/features/chat/utils";
import { fileApi } from "@/src/shared/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/src/shared/components";
import { resolveFileUrl } from "@/src/shared/lib";
import { Department } from "@/src/shared/types";
import type { IUser } from "@/src/shared/types";
import { initials, toastMessageHandler } from "@/src/shared/utils";
import { useEffect, useRef, useState } from "react";

const DEPARTMENTS = Object.values(Department);

interface ProfileEditFormProps {
  profile: IUser;
  onSaved: () => void;
}

/** Форма редактирования профиля: name / avatar-файл / bio / department. */
export function ProfileEditForm({ profile, onSaved }: ProfileEditFormProps) {
  const update = useUpdateProfile();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile.name ?? "",
    bio: profile.bio ?? "",
    department: profile.department ?? "",
  });
  // Выбранный файл аватара (без превью — только имя файла).
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      department: profile.department ?? "",
    });
    setAvatarFile(null);
    resetFileInput(avatarInputRef);
  }, [profile]);

  /** Выбор файла: проверка типа/размера, ошибки — через тосты. */
  const handleAvatarSelect = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toastMessageHandler(Error(error));
      resetFileInput(avatarInputRef);
      return;
    }
    setAvatarFile(file);
  };

  /** Сохранение: сначала POST файла (если выбран), затем PATCH профиля. */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let avatar: string | undefined;
      if (avatarFile) {
        // fileApi сам показывает тост и кидает при ошибке загрузки.
        const [uploaded] = await fileApi.uploadFiles([avatarFile]);
        avatar = uploaded?.url;
        if (!avatar) throw Error("Не удалось загрузить аватар");
      }
      await update.mutateAsync({
        name: form.name.trim(),
        ...(avatar ? { avatar } : undefined),
        bio: form.bio,
        department: (form.department || undefined) as Department | undefined,
      });
      onSaved();
    } catch {
      // Ошибки уже показаны тостом (fileApi) или текстом ниже (update).
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void handleSave(e)}>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {profile.image ? (
            <AvatarImage src={resolveFileUrl(profile.image)} />
          ) : null}
          <AvatarFallback>{initials(profile.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="line-clamp-1 font-medium">{profile.name}</span>
          <span className="text-xs text-muted-foreground">Текущий аватар</span>
        </div>
      </div>
      <Field>
        <FieldLabel htmlFor="profile-name">Имя</FieldLabel>
        <FieldContent>
          <Input
            id="profile-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            minLength={2}
            maxLength={50}
            required
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-avatar">Аватар</FieldLabel>
        <FieldContent>
          <Input
            ref={avatarInputRef}
            id="profile-avatar"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => handleAvatarSelect(e.target.files)}
          />
        </FieldContent>
        {avatarFile ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            Выбран: {avatarFile.name}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, GIF или WebP до 10 MB. Загрузится при сохранении.
          </p>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="profile-bio">О себе</FieldLabel>
        <FieldContent>
          <Textarea
            id="profile-bio"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={500}
            className="resize-none"
          />
        </FieldContent>
      </Field>
      <Field className="w-full">
        <FieldLabel htmlFor="profile-department">Отдел</FieldLabel>
        <FieldContent className="w-full">
          <Select
            id="profile-department"
            value={form.department || undefined}
            onValueChange={(v: string | null) =>
              setForm((f) => ({ ...f, department: v ?? "" }))
            }
          >
            <SelectTrigger id="profile-department" className="w-full">
              <SelectValue placeholder="Выберите отдел" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
      <Button type="submit" disabled={update.isPending || saving}>
        {saving || update.isPending ? "Сохранение…" : "Сохранить"}
      </Button>
      {update.isError ? (
        <p className="text-xs text-destructive">Не удалось сохранить профиль</p>
      ) : null}
    </form>
  );
}
