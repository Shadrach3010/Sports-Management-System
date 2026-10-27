export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="space-y-5">
      <div className="h-64 animate-pulse rounded-2xl border bg-surface-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-xl border bg-surface-muted"
          />
        ))}
      </div>
    </div>
  );
}
