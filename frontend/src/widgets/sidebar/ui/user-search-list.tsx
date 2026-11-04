"use client";

import { chatApi } from "@/src/shared/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarWithStatus,
  Item,
  ItemContent,
  ItemMedia,
  ItemTitle,
  Marker,
  MarkerContent,
} from "@/src/shared/components";
import type { IUser } from "@/src/shared/types";
import { useRouter } from "next/navigation";
import { sortAndFilterUsers } from "@/src/widgets/sidebar/utils";

interface IProps {
  users: IUser[];
  searchValue: string;
}

/** Режим поиска: пользователи (без текущего — API уже исключает), клик → direct. */
export function UserSearchList({ users, searchValue }: IProps) {
  const router = useRouter();
  const grouped = sortAndFilterUsers({ users, searchValue });

  const openDirect = async (user: IUser) => {
    try {
      const result = await chatApi.getOrCreateDirect(user.id);
      router.push(`/dashboard/${result.chat.id}`);
    } catch {
      router.push(`/dashboard/new?userId=${user.id}`);
    }
  };

  if (Object.keys(grouped).length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Ничего не найдено</p>;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {Object.entries(grouped).map(([department, list]) => (
        <div key={department}>
          <Marker variant="separator" className="mb-2 text-xs font-semibold">
            <MarkerContent>{department}</MarkerContent>
          </Marker>
          <div className="flex flex-col gap-2">
            {list.map((user) => (
              <Item key={user.id} variant="outline" className="w-full">
                <button
                  type="button"
                  onClick={() => void openDirect(user)}
                  className="flex w-full items-center gap-2.5 text-left"
                >
                  <ItemMedia variant="image">
                    <AvatarWithStatus isOnline={user.isOnline}>
                      <Avatar>
                        {user.image ? <AvatarImage src={user.image} /> : null}
                        <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </AvatarWithStatus>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="line-clamp-1">{user.name}</ItemTitle>
                  </ItemContent>
                </button>
              </Item>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
