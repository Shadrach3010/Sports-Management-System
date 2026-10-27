import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border bg-surface p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-muted text-primary">
        <SearchX aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-5 text-sm font-semibold text-accent">404 · Not found</p>
      <h1 className="mt-2 text-2xl font-semibold">
        The requested page is unavailable
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        The route may not be part of this foundation yet, or the address may be
        incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Return to overview
      </Link>
    </section>
  );
}
