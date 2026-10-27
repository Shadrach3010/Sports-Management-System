import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-surface p-10 text-center">
      <Inbox aria-hidden="true" className="mx-auto size-8 text-muted" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted">{description}</p>
    </div>
  );
}
