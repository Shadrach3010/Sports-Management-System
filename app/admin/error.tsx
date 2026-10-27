"use client";

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border bg-surface p-8 text-center shadow-sm">
      <CircleAlert aria-hidden="true" className="mx-auto size-9 text-red-700" />
      <h1 className="mt-4 text-xl font-semibold">
        Administrative data could not be loaded
      </h1>
      <p className="mt-2 text-sm text-muted">
        No changes were made. Verify the Supabase configuration or try again.
      </p>
      <Button type="button" className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
