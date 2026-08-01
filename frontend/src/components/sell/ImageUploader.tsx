'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uploadsApi } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/feedback/ToastProvider';
import { cn } from '@/lib/cn';

const MAX = 8; // max number of images
const MAX_MB = 5; // max size per image

/**
 * Drag-and-drop image board. Files are uploaded to the backend immediately and
 * the returned hosted URLs are stored on the listing — real images, served
 * from the platform. The parent owns the resulting URL list.
 */
export function ImageUploader({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  error?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || uploading) return;
      const remaining = MAX - value.length;
      if (remaining <= 0) {
        toast(`You can add up to ${MAX} images`, 'info');
        return;
      }
      const picked = Array.from(fileList).slice(0, remaining);
      // Enforce the 5 MB-per-image limit up front, before uploading.
      const tooBig = picked.filter((f) => f.size > MAX_MB * 1024 * 1024);
      if (tooBig.length) {
        toast(`Each image must be under ${MAX_MB} MB`, 'error');
      }
      const files = picked.filter((f) => f.size <= MAX_MB * 1024 * 1024);
      if (files.length === 0) return;
      setUploading(true);
      setProgress(0);
      try {
        const urls = await uploadsApi.images(files, setProgress);
        onChange([...value, ...urls]);
      } catch (err) {
        toast(apiErrorMessage(err), 'error');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [value, onChange, uploading, toast],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-brick-500 bg-brick-50'
            : error
              ? 'border-brick-400 bg-white'
              : 'border-line bg-sand-50 hover:border-ink-faint',
          uploading && 'pointer-events-none opacity-80',
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl shadow-subtle">
          {uploading ? '⏳' : '📷'}
        </span>
        {uploading ? (
          <>
            <p className="mt-3 text-sm font-medium text-ink-soft">Uploading… {progress}%</p>
            <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full bg-brick-600"
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium text-ink-soft">
              Drag &amp; drop photos, or click to browse
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              Up to {MAX} images · 5 MB each · first photo is the cover
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          <AnimatePresence>
            {value.map((url, i) => (
              <motion.div
                key={url}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative aspect-square overflow-hidden rounded-lg border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-brick-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
