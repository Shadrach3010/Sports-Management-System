export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="border-l-4 border-track-orange pl-4">
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.16em] text-track-orange">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
