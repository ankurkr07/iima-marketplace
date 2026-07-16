import { cn } from '@/lib/cn';

export function EmptyState({
  title,
  description,
  icon = '🗂️',
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-sand-50 px-6 py-16 text-center',
        className,
      )}
    >
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-white text-2xl shadow-subtle">
        {icon}
      </span>
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
