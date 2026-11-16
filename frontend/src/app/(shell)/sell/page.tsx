'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatPrice, CONDITION_LABELS } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { Button } from '@/components/ui/Button';
import { FieldError, FieldLabel, Select, TextArea, TextInput } from '@/components/ui/Field';
import { ImageUploader } from '@/components/sell/ImageUploader';
import { PageHeading } from '@/components/shell/PageHeading';
import type { ProductCondition } from '@/lib/types';

const schema = z.object({
  title: z.string().trim().min(3, 'Give your listing a clear title').max(120),
  description: z.string().trim().min(10, 'Add a few details buyers will want to know').max(4000),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).int().min(0).max(10_000_000),
  listingType: z.enum(['SALE', 'RENTAL']),
  rentalRateUnit: z.enum(['HOUR', 'DAY', 'WEEK', 'BIWEEK', 'MONTH', 'YEAR']).optional(),
  rentalAvailableFrom: z.string().optional(),
  rentalAvailableUntil: z.string().optional(),
  rentalSchedule: z.object({ days: z.array(z.number()).optional(), startTime: z.string().optional(), endTime: z.string().optional() }).optional(),
  rentalSlotMinutes: z.coerce.number().optional(),
  marketPrice: z
    .union([z.coerce.number().int().min(0).max(10_000_000), z.literal('')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  categorySlug: z.string().min(1, 'Choose a category'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  negotiable: z.boolean(),
  images: z.array(z.string()).min(1, 'Add at least one photo').max(8),
  location: z.string().trim().max(80).optional(),
  purchaseDate: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^(19|20)\d{2}$/.test(v), 'Enter a valid 4-digit year, e.g. 2023')
    .refine(
      (v) => !v || Number(v) <= new Date().getFullYear(),
      `Year can't be later than ${new Date().getFullYear()}`,
    ),
  warranty: z.string().trim().max(120).optional(),
  preferredContact: z.enum(['EMAIL', 'PHONE']),
}).superRefine((value, ctx) => {
  if (value.listingType !== 'RENTAL') return;
  if (value.price <= 0) ctx.addIssue({ code: 'custom', path: ['price'], message: 'Rental rate must be greater than zero' });
  if (!value.rentalRateUnit) ctx.addIssue({ code: 'custom', path: ['rentalRateUnit'], message: 'Choose a rental rate period' });
  if (!value.rentalAvailableFrom) ctx.addIssue({ code: 'custom', path: ['rentalAvailableFrom'], message: 'Choose when availability starts' });
  if (!value.rentalAvailableUntil) ctx.addIssue({ code: 'custom', path: ['rentalAvailableUntil'], message: 'Choose when availability ends' });
  if (!value.rentalSchedule?.days?.length) ctx.addIssue({ code: 'custom', path: ['rentalSchedule'], message: 'Select at least one available day' });
  if (!value.rentalSchedule?.startTime || !value.rentalSchedule?.endTime || value.rentalSchedule.endTime <= value.rentalSchedule.startTime) ctx.addIssue({ code: 'custom', path: ['rentalSchedule'], message: 'Choose a valid daily time window' });
  if (![30, 60, 120].includes(Number(value.rentalSlotMinutes))) ctx.addIssue({ code: 'custom', path: ['rentalSlotMinutes'], message: 'Choose a booking interval' });
  if (value.rentalAvailableFrom && value.rentalAvailableUntil && value.rentalAvailableUntil < value.rentalAvailableFrom) {
    ctx.addIssue({ code: 'custom', path: ['rentalAvailableUntil'], message: 'End must be after the start' });
  }
  if (value.rentalAvailableFrom && value.rentalAvailableFrom < todayLocal()) {
    ctx.addIssue({ code: 'custom', path: ['rentalAvailableFrom'], message: 'Availability must start in the future' });
  }
});
type FormValues = z.infer<typeof schema>;

const CONDITIONS = Object.keys(CONDITION_LABELS) as ProductCondition[];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function SellInner() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [preview, setPreview] = useState(false);

  const editSlug = params.get('edit') ?? undefined;
  const isEditing = !!editSlug;

  const { data: categories } = useQuery({ queryKey: qk.categories, queryFn: categoriesApi.list });
  const existing = useQuery({
    queryKey: qk.product(editSlug ?? ''),
    queryFn: () => productsApi.bySlug(editSlug!),
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: 'GOOD',
      negotiable: true,
      images: [],
      preferredContact: 'EMAIL',
      listingType: 'SALE',
      rentalRateUnit: 'HOUR',
      rentalSchedule: { days: [0, 1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '18:00' },
      rentalSlotMinutes: 60,
    },
  });

  // When editing, hydrate the form once the listing loads.
  useEffect(() => {
    const p = existing.data?.product;
    if (!p) return;
    reset({
      title: p.title,
      description: p.description,
      price: p.price,
      listingType: p.listingType ?? 'SALE',
      rentalRateUnit: p.rentalRateUnit ?? undefined,
      rentalAvailableFrom: p.rentalAvailableFrom?.slice(0, 10) ?? '',
      rentalAvailableUntil: p.rentalAvailableUntil?.slice(0, 10) ?? '',
      rentalSchedule: p.rentalSchedule ?? { days: [0, 1, 2, 3, 4, 5, 6], startTime: '09:00', endTime: '18:00' },
      rentalSlotMinutes: p.rentalSlotMinutes ?? 60,
      marketPrice: p.marketPrice ?? undefined,
      categorySlug: p.category?.slug ?? '',
      condition: p.condition,
      negotiable: p.negotiable,
      images: p.images,
      location: p.location ?? '',
      purchaseDate: p.purchaseDate ?? '',
      warranty: p.warranty ?? '',
      // Old listings may carry the retired 'CHAT' value — fall back to Email.
      preferredContact: p.preferredContact === 'PHONE' ? 'PHONE' : 'EMAIL',
    });
  }, [existing.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      (() => {
        const payload = {
          ...values,
          marketPrice: values.listingType === 'RENTAL' ? undefined : values.marketPrice,
          rentalAvailableFrom: values.listingType === 'RENTAL' && values.rentalAvailableFrom ? new Date(`${values.rentalAvailableFrom}T00:00:00.000Z`).toISOString() : undefined,
          rentalAvailableUntil: values.listingType === 'RENTAL' && values.rentalAvailableUntil ? new Date(`${values.rentalAvailableUntil}T23:59:59.000Z`).toISOString() : undefined,
          rentalRateUnit: values.listingType === 'RENTAL' ? values.rentalRateUnit : undefined,
          rentalSchedule: values.listingType === 'RENTAL' ? values.rentalSchedule : undefined,
          rentalSlotMinutes: values.listingType === 'RENTAL' ? values.rentalSlotMinutes : undefined,
        };
        return isEditing
          ? productsApi.update(existing.data!.product.id, payload)
          : productsApi.create(payload);
      })(),
    onSuccess: (product) => {
      toast(isEditing ? 'Listing updated' : 'Your listing is live!', 'success');
      router.push(`/product/${product.slug}`);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  if (isLoading || !isAuthenticated) return <InlineLoader />;
  if (isEditing && existing.isLoading) return <InlineLoader />;

  // Guard: only the owner may edit.
  if (isEditing && existing.data && existing.data.product.seller?.id !== user?.id) {
    return (
      <div className="container-page max-w-3xl py-20 text-center">
        <p className="font-serif text-2xl text-ink">You can only edit your own listings.</p>
        <Button className="mt-6" variant="outline" onClick={() => router.push('/marketplace')}>
          Back to marketplace
        </Button>
      </div>
    );
  }

  // Gate: buyers reach sellers on WhatsApp, so a number is required before
  // listing. Everything else on the profile stays optional.
  if (user && !user.whatsapp) {
    return (
      <PageTransition>
        <div className="container-page max-w-lg py-20">
          <div className="rounded-card border border-line bg-white p-8 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brick-50 text-2xl">
              💬
            </span>
            <h1 className="font-serif text-2xl tracking-tight text-ink">Add your WhatsApp number</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Buyers contact you on WhatsApp, so we need a number before you can list an item. It
              takes a few seconds — nothing else is required.
            </p>
            <Button className="mt-6" onClick={() => router.push('/dashboard?tab=Settings')}>
              Go to My Profile
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const values = watch();
  const isRental = values.listingType === 'RENTAL';

  return (
    <PageTransition>
      <div className="container-page max-w-3xl py-10">
        <PageHeading eyebrow={isEditing ? 'Edit listing' : 'Buy, sell or rent on campus'} title={isEditing ? 'Update your listing' : 'Create a listing'} description="Good photos and a clear description help the right person find your item." />

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-8" noValidate>
          <Section title="Photos">
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageUploader value={field.value} onChange={field.onChange} error={!!errors.images} />
              )}
            />
            <FieldError message={errors.images?.message} />
          </Section>

          <Section title="Details">
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="listingType">What are you listing?</FieldLabel>
                <div className="relative grid grid-cols-2 rounded-2xl border border-line bg-sand-100 p-1.5" role="group" aria-label="Listing type">
                  <motion.span className="absolute bottom-1.5 top-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-white shadow-sm" animate={{ x: isRental ? 'calc(100% + 0.375rem)' : 0 }} transition={{ type: 'spring', stiffness: 360, damping: 32 }} />
                  {(['SALE', 'RENTAL'] as const).map((type) => <button key={type} type="button" onClick={() => setValue('listingType', type, { shouldValidate: true })} aria-pressed={values.listingType === type} className={`relative z-10 rounded-xl px-4 py-3 text-left transition-colors ${values.listingType === type ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}><span className="block text-sm font-semibold">{type === 'SALE' ? 'Sell an item' : 'Rent out an item'}</span><span className="mt-0.5 block text-xs">{type === 'SALE' ? 'One-time purchase' : 'Set days, hours & rate'}</span></button>)}
                </div>
                <input type="hidden" {...register('listingType')} />
                <p className="mt-2 text-xs text-ink-faint">{isRental ? 'Renters send a request on WhatsApp. You confirm each booking directly.' : 'List a one-time sale and set your asking price.'}</p>
              </div>
              <div>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <TextInput
                  id="title"
                  placeholder="e.g. MacBook Air M1, 8/256GB"
                  error={!!errors.title}
                  {...register('title')}
                />
                <FieldError message={errors.title?.message} />
              </div>

              <div>
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <TextArea
                  id="description"
                  placeholder="Condition, reason for selling, what's included, any flaws…"
                  error={!!errors.description}
                  {...register('description')}
                />
                <FieldError message={errors.description?.message} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <Select id="category" error={!!errors.categorySlug} {...register('categorySlug')}>
                    <option value="">Select a category</option>
                    {categories?.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </Select>
                  <FieldError message={errors.categorySlug?.message} />
                </div>

                <div>
                  <FieldLabel htmlFor="condition">Condition</FieldLabel>
                  <Select id="condition" {...register('condition')}>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Price">
            {isRental ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="price">Rental rate (₹)</FieldLabel>
                  <TextInput id="price" inputMode="numeric" placeholder="e.g. 300" error={!!errors.price} {...register('price')} />
                  <FieldError message={errors.price?.message} />
                </div>
                <div>
                  <FieldLabel htmlFor="rentalRateUnit">Rate period</FieldLabel>
                  <Select id="rentalRateUnit" error={!!errors.rentalRateUnit} {...register('rentalRateUnit')}>
                    <option value="">Select a rate period</option>
                    <option value="HOUR">Hour</option><option value="DAY">Day</option><option value="WEEK">Week</option>
                    <option value="BIWEEK">Two weeks</option><option value="MONTH">Month</option><option value="YEAR">Year</option>
                  </Select>
                  <FieldError message={errors.rentalRateUnit?.message} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="marketPrice" hint="MRP / original — optional">
                      Market price (₹)
                    </FieldLabel>
                    <TextInput
                      id="marketPrice"
                      inputMode="numeric"
                      placeholder="e.g. 10000"
                      {...register('marketPrice')}
                    />
                    <FieldError message={errors.marketPrice?.message} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="price">Your selling price (₹)</FieldLabel>
                    <TextInput
                      id="price"
                      inputMode="numeric"
                      placeholder="0"
                      error={!!errors.price}
                      {...register('price')}
                    />
                    <FieldError message={errors.price?.message} />
                  </div>
                </div>
                <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5">
                  <input type="checkbox" className="accent-brick-600" {...register('negotiable')} />
                  <span className="text-sm text-ink-soft">Open to negotiation</span>
                </label>
              </>
            )}
          </Section>

          {isRental && (
            <Section title="Rental availability">
              <p className="mb-4 text-sm text-ink-muted">Set the date range, recurring days and daily hours when this item can be requested. You confirm requests on WhatsApp.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="rentalAvailableFrom">First available date</FieldLabel>
                  <TextInput id="rentalAvailableFrom" type="date" min={todayLocal()} error={!!errors.rentalAvailableFrom} {...register('rentalAvailableFrom')} />
                  <FieldError message={errors.rentalAvailableFrom?.message} />
                </div>
                <div>
                  <FieldLabel htmlFor="rentalAvailableUntil">Last available date</FieldLabel>
                  <TextInput id="rentalAvailableUntil" type="date" min={values.rentalAvailableFrom || todayLocal()} error={!!errors.rentalAvailableUntil} {...register('rentalAvailableUntil')} />
                  <FieldError message={errors.rentalAvailableUntil?.message} />
                </div>
              </div>
              <div className="mt-6">
                <FieldLabel>Available on</FieldLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((day, index) => {
                    const selected = values.rentalSchedule?.days?.includes(index) ?? false;
                    return <button key={day} type="button" aria-pressed={selected} onClick={() => {
                      const days = values.rentalSchedule?.days ?? [];
                      setValue('rentalSchedule.days', selected ? days.filter((d) => d !== index) : [...days, index], { shouldValidate: true });
                    }} className={`rounded-full border px-3 py-2 text-sm transition-colors ${selected ? 'border-brick-600 bg-brick-600 text-white' : 'border-line bg-white text-ink-muted hover:border-brick-300'}`}>{day.slice(0, 3)}</button>;
                  })}
                </div>
                <FieldError message={errors.rentalSchedule?.message} />
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <div><FieldLabel htmlFor="rentalStartTime">Daily start</FieldLabel><TextInput id="rentalStartTime" type="time" {...register('rentalSchedule.startTime')} /></div>
                <div><FieldLabel htmlFor="rentalEndTime">Daily end</FieldLabel><TextInput id="rentalEndTime" type="time" {...register('rentalSchedule.endTime')} /></div>
                <div><FieldLabel htmlFor="rentalSlotMinutes">Booking interval</FieldLabel><Select id="rentalSlotMinutes" {...register('rentalSlotMinutes', { valueAsNumber: true })}><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option></Select></div>
              </div>
              <p className="mt-3 text-xs text-ink-faint">Renters request durations in multiples of this interval. Requests are not reserved until you confirm.</p>
            </Section>
          )}

          <Section title="Pick-up & contact">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor="location">Pick-up point</FieldLabel>
                <TextInput id="location" placeholder="e.g. D-15" {...register('location')} />
              </div>
              {!isRental && <div>
                <FieldLabel htmlFor="purchaseDate">Bought in</FieldLabel>
                <TextInput
                  id="purchaseDate"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 2023"
                  error={!!errors.purchaseDate}
                  {...register('purchaseDate')}
                />
                <FieldError message={errors.purchaseDate?.message} />
              </div>}
              <div>
                <FieldLabel htmlFor="contact">Preferred contact</FieldLabel>
                <Select id="contact" {...register('preferredContact')}>
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone</option>
                </Select>
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
            <Button type="button" variant="ghost" onClick={() => setPreview((v) => !v)}>
              {preview ? 'Hide preview' : 'Preview listing'}
            </Button>
            <Button type="submit" size="lg" disabled={mutation.isPending}>
              {mutation.isPending
                ? isEditing
                  ? 'Saving…'
                  : 'Publishing…'
                : isEditing
                  ? 'Save changes'
                  : 'Publish listing'}
            </Button>
          </div>
        </form>

        {preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-10 overflow-hidden rounded-card border border-line bg-white p-6"
          >
            <p className="eyebrow mb-4">Preview</p>
            <div className="flex gap-5">
              <div className="aspect-square w-40 shrink-0 overflow-hidden rounded-lg bg-sand-200">
                {values.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={values.images[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div>
                <h3 className="font-serif text-xl text-ink">{values.title || 'Your title'}</h3>
                <p className="mt-1 text-2xl font-semibold text-brick-700">
                  {values.price ? formatPrice(Number(values.price)) : '₹—'}
                </p>
                <p className="mt-3 line-clamp-3 text-sm text-ink-muted">
                  {values.description || 'Your description will appear here.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5 sm:p-7">
      <h2 className="mb-4 font-serif text-lg text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<InlineLoader />}>
      <SellInner />
    </Suspense>
  );
}
