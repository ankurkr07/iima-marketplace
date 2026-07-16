'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi, qk } from '@/lib/queries';
import { CONDITION_LABELS } from '@/lib/format';
import type { ProductCondition } from '@/lib/types';
import { cn } from '@/lib/cn';

export interface Filters {
  category?: string;
  condition?: string;
  status?: string;
  hostel?: string;
  minPrice?: string;
  maxPrice?: string;
}

const CONDITIONS = Object.keys(CONDITION_LABELS) as ProductCondition[];

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

  return (
    <aside className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Filters</h2>
        <button
          onClick={onReset}
          className="text-xs font-medium text-ink-faint transition-colors hover:text-brick-700"
        >
          Reset all
        </button>
      </div>

      <FilterGroup label="Category">
        <div className="space-y-0.5">
          <RadioRow
            active={!filters.category}
            label="All categories"
            onClick={() => onChange({ category: undefined })}
          />
          {categories?.map((c) => (
            <RadioRow
              key={c.slug}
              active={filters.category === c.slug}
              label={`${c.icon}  ${c.name}`}
              count={c.count}
              onClick={() => onChange({ category: c.slug })}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Price range">
        <div className="flex items-center gap-2">
          <PriceInput
            placeholder="Min"
            value={filters.minPrice ?? ''}
            onChange={(v) => onChange({ minPrice: v || undefined })}
          />
          <span className="text-ink-faint">–</span>
          <PriceInput
            placeholder="Max"
            value={filters.maxPrice ?? ''}
            onChange={(v) => onChange({ maxPrice: v || undefined })}
          />
        </div>
      </FilterGroup>

      <FilterGroup label="Condition">
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map((c) => (
            <Chip
              key={c}
              active={filters.condition === c}
              onClick={() =>
                onChange({ condition: filters.condition === c ? undefined : c })
              }
            >
              {CONDITION_LABELS[c]}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Availability">
        <div className="flex flex-wrap gap-2">
          {[
            { v: undefined, l: 'All' },
            { v: 'AVAILABLE', l: 'Available' },
            { v: 'RESERVED', l: 'Reserved' },
            { v: 'SOLD', l: 'Sold' },
          ].map((o) => (
            <Chip
              key={o.l}
              active={filters.status === o.v}
              onClick={() => onChange({ status: o.v })}
            >
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
    <div>
      <h3 className="eyebrow mb-3">{label}</h3>
      {children}
    </div>
  );
}

function RadioRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
        active ? 'bg-brick-50 font-medium text-brick-700' : 'text-ink-soft hover:bg-sand-200',
      )}
    >
      <span>{label}</span>
      {count !== undefined && <span className="text-xs text-ink-faint">{count}</span>}
    </button>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brick-600 bg-brick-600 text-white'
          : 'border-line bg-white text-ink-muted hover:border-ink-faint',
      )}
    >
      {children}
    </button>
  );
}

function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-1 items-center rounded-lg border border-line bg-white px-2.5">
      <span className="text-sm text-ink-faint">₹</span>
      <input
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        className="w-full bg-transparent py-2 pl-1 text-sm focus:outline-none"
      />
    </div>
  );
}
