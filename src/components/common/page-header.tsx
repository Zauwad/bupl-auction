interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Standard header row for admin and public section pages. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
