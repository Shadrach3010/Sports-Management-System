import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function buttonVariants({
  variant = "default",
}: { variant?: "default" | "outline" | "sport" } = {}) {
  return cn(
    "inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "outline"
      ? "border bg-white text-foreground hover:bg-surface-muted"
      : variant === "sport"
        ? "bg-track-orange text-slate-950 shadow-lg shadow-orange-950/20 hover:bg-orange-400"
        : "bg-primary text-primary-foreground hover:opacity-90",
  );
}

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(buttonVariants(), className)} {...props} />;
}
