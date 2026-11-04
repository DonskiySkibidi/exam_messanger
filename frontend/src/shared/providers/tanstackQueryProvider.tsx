"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

export function TanstackQueryProvider({
  children,
}: PropsWithChildren<unknown>) {
  const [client] = useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
        },
      },
    }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
