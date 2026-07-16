import { cn } from '@/lib/cn';

/** A shimmering placeholder surface. Composed into richer loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} />;
}
