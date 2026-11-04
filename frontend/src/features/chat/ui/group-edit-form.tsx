"use client";

import { useUpdateGroup } from "@/src/features/chat/api";
import { fileApi } from "@/src/shared/api";
import {
  Button,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Textarea,
} from "@/src/shared/components";
import { toastMessageHandler } from "@/src/shared/utils";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  resetFileInput,
  validateImageFile,
} from "@/src/features/chat/utils";
import { useRef, useState } from "react";

interface GroupEditFormProps {
  chatId: string;
  initialName: string;
  initialDescription: string;
  onSaved: () => void;
}

/** Форма редактирования GROUP-чата: название, описание, изображение файлом. */
export function GroupEditForm({
  chatId,
  initialName,
  initialDescription,
  onSaved,
}: GroupEditFormProps) {
  const updateGroup = useUpdateGroup(chatId);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState({
    name: initialName,
    description: initialDescription,
  });
  // Выбранный файл изображения (без превью — только имя файла, как у аватара).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  /** Выбор файла: проверка типа/размера, ошибки — через тосты. */
  const handleImageSelect = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toastMessageHandler(Error(error));
      resetFileInput(imageInputRef);
      return;
    }
    setImageFile(file);
  };

  /** Сохранение: сначала POST файла (если выбран), затем PATCH группы. */
  const saveInfo = async () => {
    const name = info.name.trim();
    if (!name) {
      toastMessageHandler(Error("Название группы не может быть пустым"));
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        try {
          // fileApi сам показывает тост и кидает при ошибке загрузки.
          const [uploaded] = await fileApi.uploadFiles([imageFile]);
          imageUrl = uploaded?.url;
          if (!imageUrl) throw Error("Не удалось загрузить изображение");
        } catch {
          return; // тост уже показан в fileApi
        }
      }
      await updateGroup.mutateAsync({
        name,
        description: info.description.trim() ? info.description.trim() : null,
        ...(imageUrl ? { imageUrl } : undefined),
      });
      onSaved();
    } catch (e) {
      toastMessageHandler(e instanceof Error ? e : Error(String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="group-edit-name">Название</FieldLabel>
        <FieldContent>
          <Input
            id="group-edit-name"
            value={info.name}
            onChange={(e) => setInfo((f) => ({ ...f, name: e.target.value }))}
            maxLength={100}
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="group-edit-desc">Описание</FieldLabel>
        <FieldContent>
          <Textarea
            id="group-edit-desc"
            value={info.description}
            onChange={(e) => setInfo((f) => ({ ...f, description: e.target.value }))}
            maxLength={500}
            rows={2}
            className="resize-none"
          />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel htmlFor="group-edit-image">Изображение</FieldLabel>
        <FieldContent>
          <Input
            ref={imageInputRef}
            id="group-edit-image"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => handleImageSelect(e.target.files)}
          />
        </FieldContent>
        {imageFile ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            Выбран: {imageFile.name}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, GIF или WebP до {MAX_IMAGE_SIZE / 1024 / 1024} MB.
            Загрузится при сохранении.
          </p>
        )}
      </Field>
      <Button
        onClick={() => void saveInfo()}
        disabled={updateGroup.isPending || saving}
      >
        {saving || updateGroup.isPending ? "Сохранение…" : "Сохранить"}
      </Button>
    </div>
  );
}
