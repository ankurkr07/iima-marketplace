import { cn } from '@/lib/cn';

/**
 * The IIMA Marketplace mark. The glyph is an abstraction of the Louis Kahn
 * brick arches that define the IIM Ahmedabad campus — a repeated arch cut
 * from a solid brick block. Deliberately geometric and timeless.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="9" className="fill-brick-600" />
      {/* Two Kahn arches carved from the brick */}
      <path
        d="M9 30V19a6 6 0 0 1 12 0v11"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M21 30V22.5a4.5 4.5 0 0 1 9 0V30"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="h-8 w-8 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-serif text-[15px] font-semibold tracking-tight text-ink sm:text-[17px]">
            IIMA Marketplace
          </span>
          {/* Tagline hides on very small screens to keep the header tidy. */}
          <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint min-[420px]:block">
            Campus Buy · Sell
          </span>
        </span>
      )}
    </span>
  );
}
