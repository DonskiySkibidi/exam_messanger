import * as React from "react";
import { cn } from "cn";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
