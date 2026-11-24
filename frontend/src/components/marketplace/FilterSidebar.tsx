'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, qk } from '@/lib/queries';
import { CONDITION_LABELS } from '@/lib/format';
import type { ProductCondition } from '@/lib/types';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

export interface Filters {
  category?: string;
  condition?: string;
  status?: string;
  hostel?: string;
  minPrice?: string;
  maxPrice?: string;
}

const CONDITIONS = Object.keys(CONDITION_LABELS) as ProductCondition[];

export const PRICE_PRESETS: { label: string; min?: string; max?: string }[] = [
  { label: 'Under ₹500', max: '500' },
  { label: '₹500 – 2k', min: '500', max: '2000' },
  { label: '₹2k – 10k', min: '2000', max: '10000' },
  { label: '₹10k +', min: '10000' },
];

export function FilterSidebar({
  filters,
  onChange,
  onReset,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}) {
  const { data: categories } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });
  const [showAll, setShowAll] = useState(false);
  const activeCount = Object.values(filters).filter(Boolean).length;

  // Keep the selected category visible even when the list is collapsed.
  const sorted = categories ?? [];
  const visible = showAll ? sorted : sorted.slice(0, 7);
  const hiddenSelected = !showAll && filters.category && !visible.some((c) => c.slug === filters.category);
  const selected = sorted.find((c) => c.slug === filters.category);

  return (
    <aside className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon name="filter" className="h-4 w-4 text-brick-600" />
          Filters
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brick-600 px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </h2>
        {activeCount > 0 && (
          <button onClick={onReset} className="text-xs font-semibold text-brick-700 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <FilterGroup label="Category">
        <div className="space-y-0.5">
          <RadioRow active={!filters.category} label="All categories" onClick={() => onChange({ category: undefined })} />
          {visible.map((c) => (
            <RadioRow
              key={c.slug}
              active={filters.category === c.slug}
              icon={c.icon}
              label={c.name}
              count={c.count}
              onClick={() => onChange({ category: c.slug })}
            />
          ))}
          {hiddenSelected && selected && (
            <RadioRow active icon={selected.icon} label={selected.name} count={selected.count} onClick={() => undefined} />
          )}
        </div>
        {sorted.length > 7 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="mt-2 flex items-center gap-1 px-3 text-xs font-semibold text-brick-700 hover:underline"
          >
            {showAll ? 'Show fewer' : `Show all ${sorted.length}`}
            <Icon name="chevronDown" className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </FilterGroup>

      <FilterGroup label="Price">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = (filters.minPrice ?? '') === (p.min ?? '') && (filters.maxPrice ?? '') === (p.max ?? '');
            return (
              <Chip
                key={p.label}
                active={active}
                onClick={() =>
                  onChange(active ? { minPrice: undefined, maxPrice: undefined } : { minPrice: p.min, maxPrice: p.max })
                }
              >
                {p.label}
              </Chip>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <PriceInput placeholder="Min" value={filters.minPrice ?? ''} onChange={(v) => onChange({ minPrice: v || undefined })} />
          <span className="text-ink-faint">–</span>
          <PriceInput placeholder="Max" value={filters.maxPrice ?? ''} onChange={(v) => onChange({ maxPrice: v || undefined })} />
        </div>
      </FilterGroup>

      <FilterGroup label="Condition">
        <div className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              active={filters.condition === c}
              onClick={() => onChange({ condition: filters.condition === c ? undefined : c })}
            >
              {CONDITION_LABELS[c]}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Availability">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { v: undefined, l: 'Any' },
            { v: 'AVAILABLE', l: 'Available' },
            { v: 'RESERVED', l: 'Reserved' },
            { v: 'SOLD', l: 'Sold' },
          ].map((o) => (
            <Chip key={o.l} active={filters.status === o.v} onClick={() => onChange({ status: o.v })} block>
              {o.l}
            </Chip>
          ))}
        </div>
      </FilterGroup>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-5">
      <h3 className="eyebrow mb-3 text-[11px]">{label}</h3>
      {children}
    </div>
  );
}

function RadioRow({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-brick-50 font-semibold text-brick-700' : 'text-ink-soft hover:bg-sand-100',
      )}
    >
      {icon ? <span className="w-5 text-center" aria-hidden>{icon}</span> : <Icon name="layers" className="h-4 w-5" />}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={cn('text-xs tabular-nums', active ? 'text-brick-600' : 'text-ink-faint')}>{count}</span>
      )}
    </button>
  );
}

function Chip({
  active,
  children,
  onClick,
  block,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  block?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        block && 'w-full',
        active ? 'border-brick-600 bg-brick-600 text-white' : 'border-line bg-white text-ink-muted hover:border-brick-300 hover:text-brick-700',
      )}
    >
      {children}
    </button>
  );
}

function PriceInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex flex-1 items-center rounded-lg border border-line bg-white px-2.5 focus-within:border-brick-400 focus-within:ring-4 focus-within:ring-brick-600/10">
      <span className="text-sm text-ink-faint">₹</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        aria-label={`${placeholder} price`}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        className="w-full bg-transparent py-2 pl-1 text-sm focus:outline-none"
      />
    </div>
  );
}
