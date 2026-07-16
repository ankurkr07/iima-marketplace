import { cn } from '@/lib/cn';
import type { ProductCondition, ProductStatus } from '@/lib/types';
import { CONDITION_LABELS } from '@/lib/format';

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-tight',
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<ProductStatus, string> = {
  AVAILABLE: 'bg-brick-50 text-brick-700',
  RESERVED: 'bg-gold/15 text-gold',
  SOLD: 'bg-ink text-white',
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge className={STATUS_STYLES[status]}>{label}</Badge>;
}

export function ConditionBadge({ condition }: { condition: ProductCondition }) {
  return (
    <Badge className="bg-sand-200 text-ink-muted">{CONDITION_LABELS[condition]}</Badge>
  );
}
