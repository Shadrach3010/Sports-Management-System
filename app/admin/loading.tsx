export default function AdminLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading administration"
      className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <div className="h-80 animate-pulse rounded-xl bg-surface-muted" />
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
