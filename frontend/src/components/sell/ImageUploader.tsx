'use client';

import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { uploadsApi } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { useToast } from '@/components/feedback/ToastProvider';
import { Icon } from '@/components/ui/Icon';
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
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging
            ? 'border-brick-500 bg-brick-50'
            : error
              ? 'border-brick-400 bg-white'
              : 'border-line bg-sand-50 hover:border-brick-300 hover:bg-brick-50/30',
          uploading && 'pointer-events-none opacity-80',
        )}
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-brick-600 shadow-card">
          <Icon name={uploading ? 'clock' : 'image'} className="h-6 w-6" />
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
              <span className="font-semibold text-brick-700">Click to upload</span> or drag &amp; drop photos
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
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          <AnimatePresence>
            {value.map((url, i) => (
              <motion.div
                key={url}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-sand-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brick-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onChange([url, ...value.filter((_, idx) => idx !== i)])}
                    className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-white/95 py-1 text-[10px] font-semibold text-ink-soft shadow-subtle transition-opacity hover:text-brick-700 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/75 text-white transition-opacity hover:bg-brick-700 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
