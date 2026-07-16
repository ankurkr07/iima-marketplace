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
import type { ProductCondition } from '@/lib/types';

const schema = z.object({
  title: z.string().trim().min(3, 'Give your listing a clear title').max(120),
  description: z.string().trim().min(10, 'Add a few details buyers will want to know').max(4000),
  price: z.coerce.number({ invalid_type_error: 'Enter a price' }).int().min(0).max(10_000_000),
  categorySlug: z.string().min(1, 'Choose a category'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR']),
  negotiable: z.boolean(),
  images: z.array(z.string()).min(1, 'Add at least one photo').max(8),
  location: z.string().trim().max(80).optional(),
  purchaseDate: z.string().trim().max(40).optional(),
  warranty: z.string().trim().max(120).optional(),
  preferredContact: z.enum(['CHAT', 'PHONE', 'EMAIL']),
});
type FormValues = z.infer<typeof schema>;

const CONDITIONS = Object.keys(CONDITION_LABELS) as ProductCondition[];

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
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition: 'GOOD',
      negotiable: true,
      images: [],
      preferredContact: 'CHAT',
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
      categorySlug: p.category?.slug ?? '',
      condition: p.condition,
      negotiable: p.negotiable,
      images: p.images,
      location: p.location ?? '',
      purchaseDate: p.purchaseDate ?? '',
      warranty: p.warranty ?? '',
      preferredContact: p.preferredContact,
    });
  }, [existing.data, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEditing
        ? productsApi.update(existing.data!.product.id, values)
        : productsApi.create(values),
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

  return (
    <PageTransition>
      <div className="container-page max-w-3xl py-10">
        <header className="mb-8">
          <p className="eyebrow">{isEditing ? 'Edit listing' : 'Sell an item'}</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">
            {isEditing ? 'Update your listing' : 'Create a listing'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Good photos and an honest description sell faster. Takes about a minute.
          </p>
        </header>

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
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="price">Asking price (₹)</FieldLabel>
                <TextInput
                  id="price"
                  inputMode="numeric"
                  placeholder="0"
                  error={!!errors.price}
                  {...register('price')}
                />
                <FieldError message={errors.price?.message} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-line bg-white px-4 py-2.5">
                <input type="checkbox" className="accent-brick-600" {...register('negotiable')} />
                <span className="text-sm text-ink-soft">Open to negotiation</span>
              </label>
            </div>
          </Section>

          <Section title="Pick-up & contact">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <FieldLabel htmlFor="location">Pick-up point</FieldLabel>
                <TextInput id="location" placeholder="e.g. D-15" {...register('location')} />
              </div>
              <div>
                <FieldLabel htmlFor="purchaseDate">Bought in</FieldLabel>
                <TextInput id="purchaseDate" placeholder="e.g. 2023" {...register('purchaseDate')} />
              </div>
              <div>
                <FieldLabel htmlFor="contact">Preferred contact</FieldLabel>
                <Select id="contact" {...register('preferredContact')}>
                  <option value="CHAT">In-app chat</option>
                  <option value="PHONE">Phone</option>
                  <option value="EMAIL">Email</option>
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
    <section className="rounded-card border border-line bg-white p-6">
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
