'use client';

import { useEffect, useState } from 'react';

/**
 * WhatsApp number entry: a country-code dropdown (default +91) plus a plain
 * national number box. The user never types the country code — we compose the
 * full number ourselves, which keeps the wa.me link reliable. The value handed
 * to the parent is the combined string, e.g. "+919991902068".
 */

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+880', label: '🇧🇩 +880' },
  { code: '+977', label: '🇳🇵 +977' },
  { code: '+49', label: '🇩🇪 +49' },
  { code: '+33', label: '🇫🇷 +33' },
];
// Longest codes first so prefix matching is unambiguous.
const CODES_BY_LEN = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

export function splitWhatsapp(full: string | null | undefined): { code: string; number: string } {
  const raw = (full ?? '').trim();
  if (!raw) return { code: '+91', number: '' };
  for (const { code } of CODES_BY_LEN) {
    if (raw.startsWith(code)) return { code, number: raw.slice(code.length).replace(/\D/g, '') };
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 10) return { code: `+${digits.slice(0, digits.length - 10)}`, number: digits.slice(-10) };
  return { code: '+91', number: digits };
}

export function WhatsAppInput({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (full: string) => void;
  error?: boolean;
}) {
  const initial = splitWhatsapp(value);
  const [code, setCode] = useState(initial.code);
  const [number, setNumber] = useState(initial.number);

  // Re-sync when the incoming value changes (e.g. after the profile loads).
  useEffect(() => {
    const s = splitWhatsapp(value);
    setCode(s.code);
    setNumber(s.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (c: string, n: string) => onChange(n ? `${c}${n}` : '');

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors focus-within:ring-2 focus-within:ring-brick-600/40 ${
        error ? 'border-brick-500' : 'border-line'
      }`}
    >
      <select
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          emit(e.target.value, number);
        }}
        className="border-r border-line bg-sand-100 px-2.5 text-sm font-medium text-ink-soft focus:outline-none"
        aria-label="Country code"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        inputMode="numeric"
        value={number}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
          setNumber(digits);
          emit(code, digits);
        }}
        placeholder="10-digit number"
        className="w-full bg-transparent px-3.5 py-2.5 text-sm focus:outline-none"
      />
    </div>
  );
}
