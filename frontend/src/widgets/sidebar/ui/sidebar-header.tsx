"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/src/shared/components";
import { ArrowLeft, EllipsisVertical, Menu, Plus, Search } from "lucide-react";
interface IProps {
  mode: "chats" | "search" | "account";
  searchValue: string;
  isAdmin: boolean;
  onSearchChange: (value: string) => void;
  onSearchFocus: () => void;
  onBack: () => void;
  onAccount: () => void;
  onLogout: () => void;
  onCreateGroup: () => void;
}

/**
 * Header сайдбара: поиск + Options/Back на одной строке + «+» для ADMIN.
 * Режим account: заголовок «Настройки» вместо поиска.
 */
export function SidebarHeader({
  mode,
  searchValue,
  isAdmin,
  onSearchChange,
  onSearchFocus,
  onBack,
  onAccount,
  onLogout,
  onCreateGroup,
}: IProps) {
  return (
    <div className="flex w-full items-center gap-2">
      {mode === "search" && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Назад"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </Button>
      )}
      {mode === "chats" && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Options" />
            }
          >
            <Menu size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem onClick={onAccount}>Аккаунт</DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>Выйти</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* {mode === "search" || mode !== "account" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Назад"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Options" />
            }
          >
            <Menu size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem onClick={onAccount}>Аккаунт</DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>Выйти</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )} */}

      {(mode === "search" || mode === "chats") && (
        <InputGroup className="flex-1 border border-input bg-[#fcfcfc] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
          <InputGroupInput
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Поиск…"
            aria-label="Поиск пользователей"
          />
          <InputGroupAddon>
            <Search size={18} />
          </InputGroupAddon>
        </InputGroup>
      )}
      {/* {mode === "account" ? (
        // <h2 className="flex-1 text-base font-semibold">Настройки</h2>
        <></>
      ) : (
        <InputGroup className="flex-1">
          <InputGroupInput
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            placeholder="Поиск…"
            aria-label="Поиск пользователей"
          />
          <InputGroupAddon>
            <Search size={18} />
          </InputGroupAddon>
        </InputGroup>
      )} */}

      {isAdmin && mode !== "account" ? (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Создать группу"
          onClick={onCreateGroup}
        >
          <Plus size={18} />
        </Button>
      ) : null}
    </div>
  );
}
