"use client";

import { PropsWithChildren } from "react";
import { TanstackQueryProvider } from "@/src/shared/providers";
import { ToasterProvider } from "@/src/shared/providers";

export function MainProvider({ children }: PropsWithChildren<unknown>) {
  return (
    <>
      <ToasterProvider />
      <TanstackQueryProvider>{children}</TanstackQueryProvider>
    </>
  );
}
