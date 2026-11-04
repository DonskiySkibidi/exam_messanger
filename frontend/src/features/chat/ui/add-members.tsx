"use client";

import { useAddMembers, useUserSearch } from "@/src/features/chat/api";
import {
  Button,
  Checkbox,
  Input,
  Label,
} from "@/src/shared/components";
import { toastMessageHandler } from "@/src/shared/utils";
import { useState } from "react";

interface AddMembersProps {
  chatId: string;
  existingIds: string[];
  onAdded: () => void;
}

/** Поиск + мультивыбор пользователей для добавления в группу. */
export function AddMembers({ chatId, existingIds, onAdded }: AddMembersProps) {
  const addMembers = useAddMembers(chatId);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const { data: found = [] } = useUserSearch(query, true);

  const existing = new Set(existingIds);
  const candidates = found.filter((u) => !existing.has(u.id));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="group-add-search" className="sr-only">
        Поиск пользователей
      </Label>
      <Input
        id="group-add-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск пользователей…"
      />
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {candidates.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <Checkbox
              checked={selected.includes(u.id)}
              onCheckedChange={(checked) =>
                setSelected((prev) =>
                  checked === true
                    ? [...prev, u.id]
                    : prev.filter((id) => id !== u.id),
                )
              }
            />
            <span className="line-clamp-1">{u.name}</span>
          </label>
        ))}
        {query.trim() && candidates.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Никого не найдено
          </p>
        ) : null}
      </div>
      <Button
        size="sm"
        disabled={selected.length === 0 || addMembers.isPending}
        onClick={() =>
          addMembers.mutate(selected, {
            onSuccess: onAdded,
            onError: (e) =>
              toastMessageHandler(e instanceof Error ? e : Error(String(e))),
          })
        }
      >
        {addMembers.isPending
          ? "Добавление…"
          : `Добавить (${selected.length})`}
      </Button>
    </div>
  );
}
