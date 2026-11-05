import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-muted text-muted",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-800 ring-red-200",
  info: "bg-blue-50 text-blue-800 ring-blue-200",
};

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 self-start items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold leading-none ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
