import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border bg-surface p-8 text-center shadow-sm">
      <ShieldX aria-hidden="true" className="mx-auto size-10 text-red-700" />
      <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your verified account does not have an active role for this
        administrative area.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Return to overview
      </Link>
    </section>
  );
}
