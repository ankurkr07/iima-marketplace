'use client';

import { Suspense, forwardRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { categoriesApi, productsApi, qk } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatPrice, rentalUnitLabel, CONDITION_LABELS } from '@/lib/format';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { Button } from '@/components/ui/Button';
import { FieldError, FieldLabel, Select, TextArea, TextInput } from '@/components/ui/Field';
import { ImageUploader } from '@/components/sell/ImageUploader';
import { PageHeading } from '@/components/shell/PageHeading';
import { Icon } from '@/components/ui/Icon';
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
      listingType: params.get('type') === 'RENTAL' ? 'RENTAL' : 'SALE',
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
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brick-50 text-brick-700">
              <Icon name="chat" className="h-7 w-7" />
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
  const category = categories?.find((c) => c.slug === values.categorySlug);
  const price = Number(values.price) || 0;
  const market = Number(values.marketPrice) || 0;
  const off = !isRental && market > price && price > 0 ? Math.round((1 - price / market) * 100) : 0;

  const checklist = [
    { label: 'At least one photo', done: (values.images?.length ?? 0) > 0, target: 'sec-photos' },
    { label: 'A clear title', done: (values.title?.trim().length ?? 0) >= 3, target: 'sec-details' },
    { label: 'A helpful description', done: (values.description?.trim().length ?? 0) >= 10, target: 'sec-details' },
    { label: 'A category', done: !!values.categorySlug, target: 'sec-details' },
    { label: isRental ? 'A rental rate' : 'A price', done: isRental ? price > 0 : String(values.price ?? '') !== '', target: 'sec-price' },
  ];
  const ready = checklist.filter((c) => c.done).length;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <PageTransition>
      <div className="container-page py-8 sm:py-10">
        <PageHeading
          crumbs={[
            { label: isEditing ? 'Dashboard' : 'Marketplace', href: isEditing ? '/dashboard?tab=My+listings' : '/marketplace' },
            { label: isEditing ? 'Edit listing' : 'New listing' },
          ]}
          eyebrow={isEditing ? 'Edit listing' : 'Sell or rent on campus'}
          title={isEditing ? 'Update your listing' : 'Create a listing'}
          description="Good photos and a clear description help the right person find your item — most listings take about a minute."
        />

        <form
          onSubmit={handleSubmit(
            (v) => mutation.mutate(v),
            () => toast('Please fix the highlighted fields', 'error'),
          )}
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8"
          noValidate
        >
          <div className="space-y-6">
            <Section n={1} id="sec-type" title="What are you listing?">
              <div className="grid grid-cols-2 gap-3" role="group" aria-label="Listing type">
                {(['SALE', 'RENTAL'] as const).map((type) => {
                  const active = values.listingType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue('listingType', type, { shouldValidate: true })}
                      aria-pressed={active}
                      className={`relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${active ? 'border-brick-600 bg-brick-50/50' : 'border-line bg-white hover:border-brick-200'}`}
                    >
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-brick-600 text-white' : 'bg-sand-100 text-ink-muted'}`}>
                        <Icon name={type === 'SALE' ? 'tag' : 'key'} className="h-5 w-5" />
                      </span>
                      <span className="pr-4">
                        <span className="block text-sm font-semibold text-ink">{type === 'SALE' ? 'Sell an item' : 'Rent it out'}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{type === 'SALE' ? 'One-time sale at your price' : 'Set dates, hours & a rate'}</span>
                      </span>
                      {active && (
                        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-brick-600 text-white">
                          <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register('listingType')} />
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <Icon name="info" className="h-3.5 w-3.5" />
                {isRental ? 'Renters send a request on WhatsApp. You confirm each booking directly.' : 'Buyers reach you on WhatsApp, phone or email.'}
              </p>
            </Section>

            <Section n={2} id="sec-photos" title="Photos" hint="Up to 8 · the first is the cover">
              <Controller
                control={control}
                name="images"
                render={({ field }) => <ImageUploader value={field.value} onChange={field.onChange} error={!!errors.images} />}
              />
              <FieldError message={errors.images?.message} />
            </Section>

            <Section n={3} id="sec-details" title="Details">
              <div className="space-y-5">
                <div>
                  <FieldLabel htmlFor="title" hint={`${values.title?.length ?? 0}/120`}>
                    Title
                  </FieldLabel>
                  <TextInput id="title" placeholder="e.g. MacBook Air M1, 8/256GB" maxLength={120} error={!!errors.title} {...register('title')} />
                  <FieldError message={errors.title?.message} />
                </div>

                <div>
                  <FieldLabel htmlFor="description" hint={`${values.description?.length ?? 0}/4000`}>
                    Description
                  </FieldLabel>
                  <TextArea
                    id="description"
                    placeholder="Condition, reason for selling, what's included, any flaws…"
                    error={!!errors.description}
                    {...register('description')}
                  />
                  <FieldError message={errors.description?.message} />
                </div>

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
                  <FieldLabel>Condition</FieldLabel>
                  <input type="hidden" {...register('condition')} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CONDITIONS.map((c) => {
                      const active = values.condition === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setValue('condition', c, { shouldValidate: true })}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-brick-600 bg-brick-600 text-white' : 'border-line bg-white text-ink-soft hover:border-brick-300'}`}
                        >
                          {CONDITION_LABELS[c]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

            <Section n={4} id="sec-price" title={isRental ? 'Rental rate' : 'Price'}>
              {isRental ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="price">Rental rate (₹)</FieldLabel>
                    <RupeeInput id="price" placeholder="e.g. 300" error={!!errors.price} {...register('price')} />
                    <FieldError message={errors.price?.message} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="rentalRateUnit">Per</FieldLabel>
                    <Select id="rentalRateUnit" error={!!errors.rentalRateUnit} {...register('rentalRateUnit')}>
                      <option value="">Select a rate period</option>
                      <option value="HOUR">Hour</option>
                      <option value="DAY">Day</option>
                      <option value="WEEK">Week</option>
                      <option value="BIWEEK">Two weeks</option>
                      <option value="MONTH">Month</option>
                      <option value="YEAR">Year</option>
                    </Select>
                    <FieldError message={errors.rentalRateUnit?.message} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="price">Your selling price (₹)</FieldLabel>
                      <RupeeInput id="price" placeholder="0" error={!!errors.price} {...register('price')} />
                      <FieldError message={errors.price?.message} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="marketPrice" hint="Optional">
                        Original / MRP (₹)
                      </FieldLabel>
                      <RupeeInput id="marketPrice" placeholder="e.g. 10000" {...register('marketPrice')} />
                      <FieldError message={errors.marketPrice?.message} />
                    </div>
                  </div>
                  {off > 0 && (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <Icon name="trend" className="h-3.5 w-3.5" /> Buyers will see “Save {off}%”
                    </p>
                  )}
                  <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-line bg-sand-50 px-4 py-3">
                    <span>
                      <span className="block text-sm font-medium text-ink-soft">Open to negotiation</span>
                      <span className="block text-xs text-ink-faint">Shows a “Negotiable” tag on your listing</span>
                    </span>
                    <input type="checkbox" className="h-5 w-5 accent-brick-600" {...register('negotiable')} />
                  </label>
                </>
              )}
            </Section>

            {isRental && (
              <Section n={5} id="sec-rental" title="Rental availability" hint="You confirm each request on WhatsApp">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="rentalAvailableFrom">First available date</FieldLabel>
                    <TextInput id="rentalAvailableFrom" type="date" min={todayLocal()} error={!!errors.rentalAvailableFrom} {...register('rentalAvailableFrom')} />
                    <FieldError message={errors.rentalAvailableFrom?.message} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="rentalAvailableUntil">Last available date</FieldLabel>
                    <TextInput
                      id="rentalAvailableUntil"
                      type="date"
                      min={values.rentalAvailableFrom || todayLocal()}
                      error={!!errors.rentalAvailableUntil}
                      {...register('rentalAvailableUntil')}
                    />
                    <FieldError message={errors.rentalAvailableUntil?.message} />
                  </div>
                </div>
                <div className="mt-6">
                  <FieldLabel>Available on</FieldLabel>
                  <div className="mt-1 grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map((day, index) => {
                      const selected = values.rentalSchedule?.days?.includes(index) ?? false;
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={selected}
                          aria-label={day}
                          onClick={() => {
                            const days = values.rentalSchedule?.days ?? [];
                            setValue('rentalSchedule.days', selected ? days.filter((d) => d !== index) : [...days, index], { shouldValidate: true });
                          }}
                          className={`rounded-xl border py-2.5 text-xs font-semibold transition-colors sm:text-sm ${selected ? 'border-brick-600 bg-brick-600 text-white' : 'border-line bg-white text-ink-muted hover:border-brick-300'}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError message={errors.rentalSchedule?.message} />
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="rentalStartTime">Daily start</FieldLabel>
                    <TextInput id="rentalStartTime" type="time" {...register('rentalSchedule.startTime')} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="rentalEndTime">Daily end</FieldLabel>
                    <TextInput id="rentalEndTime" type="time" {...register('rentalSchedule.endTime')} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="rentalSlotMinutes">Booking interval</FieldLabel>
                    <Select id="rentalSlotMinutes" {...register('rentalSlotMinutes', { valueAsNumber: true })}>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                    </Select>
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-faint">Renters request durations in multiples of this interval. Nothing is reserved until you confirm.</p>
              </Section>
            )}

            <Section n={isRental ? 6 : 5} id="sec-contact" title="Pick-up & contact">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="location">Pick-up point</FieldLabel>
                  <TextInput id="location" placeholder="e.g. D-15, New Campus" {...register('location')} />
                </div>
                {!isRental && (
                  <div>
                    <FieldLabel htmlFor="purchaseDate" hint="Year">
                      Bought in
                    </FieldLabel>
                    <TextInput
                      id="purchaseDate"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="e.g. 2023"
                      error={!!errors.purchaseDate}
                      {...register('purchaseDate')}
                    />
                    <FieldError message={errors.purchaseDate?.message} />
                  </div>
                )}
              </div>
              <div className="mt-5">
                <FieldLabel>Preferred contact</FieldLabel>
                <input type="hidden" {...register('preferredContact')} />
                <div className="grid grid-cols-2 gap-2">
                  {(['EMAIL', 'PHONE'] as const).map((m) => {
                    const active = values.preferredContact === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setValue('preferredContact', m)}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'border-brick-600 bg-brick-50 text-brick-700' : 'border-line bg-white text-ink-soft hover:border-brick-300'}`}
                      >
                        <Icon name={m === 'EMAIL' ? 'mail' : 'phone'} className="h-4 w-4" />
                        {m === 'EMAIL' ? 'Email' : 'Phone'}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-ink-faint">WhatsApp is always shown first when it&apos;s visible on your profile.</p>
              </div>
            </Section>
          </div>

          {/* Sticky preview + checklist */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-subtle">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <p className="eyebrow text-[10px]">Live preview</p>
                <span className="text-[11px] text-ink-faint">How buyers see it</span>
              </div>
              <div className="p-4">
                <div className="overflow-hidden rounded-2xl border border-line">
                  <div className="relative aspect-[4/3] bg-sand-100">
                    {values.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={values.images[0]} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="grid h-full place-items-center text-ink-faint">
                        <Icon name="image" className="h-10 w-10" />
                      </div>
                    )}
                    <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-subtle ${isRental ? 'bg-ink text-white' : 'bg-white text-ink-soft'}`}>
                      {isRental ? 'For rent' : 'For sale'}
                    </span>
                  </div>
                  <div className="p-3.5">
                    {category && <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">{category.name}</p>}
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{values.title || 'Your listing title'}</p>
                    <p className="mt-1.5 text-lg font-bold text-ink">
                      {String(values.price ?? '') !== '' ? formatPrice(price) : '₹ —'}
                      {isRental && <span className="text-xs font-medium text-ink-muted"> / {rentalUnitLabel(values.rentalRateUnit)}</span>}
                      {off > 0 && <span className="ml-2 text-xs text-ink-faint line-through">{formatPrice(market)}</span>}
                    </p>
                    <p className="mt-2 inline-block rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      {CONDITION_LABELS[values.condition ?? 'GOOD']}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-5 shadow-subtle">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Ready to publish</p>
                <span className="text-xs font-semibold tabular-nums text-ink-muted">
                  {ready}/{checklist.length}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200">
                <motion.div
                  className="h-full rounded-full bg-brick-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(ready / checklist.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <ul className="mt-3 space-y-1">
                {checklist.map((c) => (
                  <li key={c.label}>
                    <button
                      type="button"
                      onClick={() => jump(c.target)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-sm transition-colors hover:bg-sand-50 ${c.done ? 'text-ink-faint' : 'text-ink-soft'}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${c.done ? 'bg-emerald-600 text-white' : 'border border-line'}`}>
                        {c.done && <Icon name="check" className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
              <Button type="submit" size="lg" fullWidth className="mt-4" disabled={mutation.isPending}>
                {mutation.isPending ? (isEditing ? 'Saving…' : 'Publishing…') : isEditing ? 'Save changes' : 'Publish listing'}
              </Button>
              {isEditing && (
                <Button type="button" variant="ghost" fullWidth className="mt-2" onClick={() => router.back()}>
                  Cancel
                </Button>
              )}
            </div>

            <div className="rounded-3xl bg-sand-100 p-5 text-xs leading-relaxed text-ink-muted">
              <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="sparkle" className="h-4 w-4 text-brick-600" /> Tips that sell faster
              </p>
              <ul className="space-y-1">
                <li>• Shoot in daylight, against a plain background.</li>
                <li>• Mention age, flaws and what&apos;s included.</li>
                <li>• Price fairly — adding the MRP shows the saving.</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </PageTransition>
  );
}

const RupeeInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  function RupeeInput({ error, className, ...props }, ref) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-faint">₹</span>
        <TextInput ref={ref} inputMode="numeric" error={error} className={`pl-8 ${className ?? ''}`} {...props} />
      </div>
    );
  },
);

function Section({
  n,
  id,
  title,
  hint,
  children,
}: {
  n: number;
  id: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 rounded-3xl border border-line bg-white p-5 shadow-subtle sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brick-600 text-xs font-bold text-white">{n}</span>
        <h2 className="font-serif text-lg text-ink">{title}</h2>
        {hint && <span className="ml-auto hidden text-xs text-ink-faint sm:block">{hint}</span>}
      </div>
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
