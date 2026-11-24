import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  crumbs,
  className = '',
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Optional breadcrumb trail shown above the eyebrow. */
  crumbs?: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <header className={`page-heading ${className}`}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} className="mb-3" />}
        <p className="eyebrow flex items-center gap-2">
          <span className="h-px w-5 bg-brick-600" aria-hidden />
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Breadcrumbs({ items, className = '' }: { items: { label: string; href?: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex min-w-0 items-center gap-1.5 text-xs text-ink-faint sm:text-sm ${className}`}>
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          {c.href ? (
            <Link href={c.href} className="shrink-0 transition-colors hover:text-brick-700">
              {c.label}
            </Link>
          ) : (
            <span className="truncate text-ink-muted" aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
