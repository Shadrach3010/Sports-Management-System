"use client";

import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border bg-surface p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
        <AlertTriangle aria-hidden="true" className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">
        This page could not be loaded
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        No data was changed. Try the request again, or contact an administrator
        if the problem continues.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </section>
  );
}
