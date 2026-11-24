import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  title,
  description,
  icon = 'box',
  action,
  className,
}: {
  title: string;
  description?: string;
  /** A line-icon name, or a short emoji/string for legacy callers. */
  icon?: IconName | string;
  action?: React.ReactNode;
  className?: string;
}) {
  const isIconName = /^[a-zA-Z]+$/.test(icon);
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center',
        className,
      )}
    >
      <span className="relative mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brick-50 text-brick-700 ring-8 ring-brick-50/40">
        {isIconName ? <Icon name={icon as IconName} className="h-7 w-7" /> : <span className="text-2xl">{icon}</span>}
      </span>
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
