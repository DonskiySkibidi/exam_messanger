"use client";

import { useCreateGroup, useUserSearch } from "@/src/features/chat";
import type { GroupFormValues } from "@/src/features/chat";
import { groupSchema } from "@/src/features/chat";
import {
  Button,
  Checkbox,
  Field,
  FieldContent,
  FieldLabel,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@/src/shared/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface IProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sheet создания группы (только ADMIN). Участники — Checkbox-список. */
export function CreateGroupSheet({ open, onOpenChange }: IProps) {
  const create = useCreateGroup();
  const [query, setQuery] = useState("");
  const { data: users = [] } = useUserSearch(query, open);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "", imageUrl: "", memberIds: [] },
  });

  const selected = form.watch("memberIds");

  const toggleMember = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((m) => m !== id)
      : [...selected, id];
    form.setValue("memberIds", next, { shouldValidate: true });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Новая группа</SheetTitle>
          <SheetDescription>
            Название и участники. Создавать могут только администраторы.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 p-4"
          onSubmit={form.handleSubmit((values) => {
            create.mutate(
              {
                name: values.name,
                description: values.description || undefined,
                imageUrl: values.imageUrl || undefined,
                memberIds: values.memberIds,
              },
              {
                onSuccess: () => {
                  onOpenChange(false);
                  form.reset();
                },
              },
            );
          })}
        >
          <Field>
            <FieldLabel htmlFor="group-name">Название</FieldLabel>
            <FieldContent>
              <Input
                id="group-name"
                {...form.register("name")}
                placeholder="Команда разработки"
              />
            </FieldContent>
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="group-desc">Описание</FieldLabel>
            <FieldContent>
              <Textarea
                id="group-desc"
                {...form.register("description")}
                className="resize-none"
                rows={3}
              />
            </FieldContent>
          </Field>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-search">Участники</Label>
            <Input
              id="group-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск пользователей…"
            />
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={selected.includes(u.id)}
                    onCheckedChange={() => toggleMember(u.id)}
                  />
                  <span className="line-clamp-1">{u.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {u.department ?? ""}
                  </span>
                </label>
              ))}
              {users.length === 0 ? (
                <p className="px-2 py-4 text-xs text-muted-foreground">
                  {/* Начните вводить имя для поиска */}
                  Ничего не найдено. Попробуйте изменить запрос.
                </p>
              ) : null}
            </div>
            {form.formState.errors.memberIds ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.memberIds.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Создание…" : `Создать (${selected.length})`}
          </Button>
          {create.isError ? (
            <p className="text-xs text-destructive">
              Нет прав или ошибка сервера (403 для не-ADMIN)
            </p>
          ) : null}
        </form>
      </SheetContent>
    </Sheet>
  );
}
