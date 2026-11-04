"use client";

import { AvatarBadge } from "@/src/shared/components";
import { cn } from "cn";
import type { PropsWithChildren } from "react";

interface AvatarWithStatusProps extends PropsWithChildren {
  isOnline: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

/** Обёртка над Avatar: зелёный/серый бейдж присутствия в реальном времени. */
export function AvatarWithStatus({ isOnline, size = "default", className, children }: AvatarWithStatusProps) {
  return (
    <span data-size={size} className={cn("group/avatar relative inline-flex shrink-0", className)}>
      {children}
      <AvatarBadge
        aria-label={isOnline ? "online" : "offline"}
        className={cn(isOnline ? "bg-emerald-500" : "bg-muted-foreground/40")}
      />
    </span>
  );
}
