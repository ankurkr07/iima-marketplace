import { cn } from '@/lib/cn';
import { forwardRef } from 'react';

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between">
      <span className="text-sm font-medium text-ink-soft">{children}</span>
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

const baseField =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint/60 focus:border-brick-400 focus:outline-none focus:ring-4 focus:ring-brick-600/10';

export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(function TextInput({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(baseField, error ? 'border-brick-500 bg-brick-50/30' : 'border-line', className)}
      {...props}
    />
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function TextArea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseField, 'min-h-[120px] resize-y', error ? 'border-brick-500 bg-brick-50/30' : 'border-line', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(baseField, 'appearance-auto pr-10', error ? 'border-brick-500 bg-brick-50/30' : 'border-line', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brick-600">
      <span aria-hidden>●</span> {message}
    </p>
  );
}
