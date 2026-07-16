'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { adminApi, productsApi, qk } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatPrice, memberSince } from '@/lib/format';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/feedback/ToastProvider';
import { InlineLoader } from '@/components/brand/Loader';
import { PageTransition } from '@/components/shell/PageTransition';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const TABS = ['Overview', 'Listings', 'Members', 'Bulk email'] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Overview');

  useEffect(() => {
    if (!isLoading && user?.role !== 'ADMIN') router.replace('/marketplace');
  }, [isLoading, user, router]);

  if (isLoading || user?.role !== 'ADMIN') return <InlineLoader />;

  return (
    <PageTransition>
      <div className="container-page py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Control panel</h1>
          </div>
          <span className="rounded-full bg-brick-50 px-3 py-1 text-xs font-medium text-brick-700">
            Restricted access
          </span>
        </header>

        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                tab === t ? 'text-brick-700' : 'text-ink-muted hover:text-ink-soft',
              )}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brick-600"
                />
              )}
            </button>
          ))}
        </div>

        {tab === 'Overview' && <Overview />}
        {tab === 'Listings' && <Listings />}
        {tab === 'Members' && <Members />}
        {tab === 'Bulk email' && <BulkEmail />}
      </div>
    </PageTransition>
  );
}

function Overview() {
  const { data } = useQuery({ queryKey: ['admin-overview'], queryFn: adminApi.overview });
  if (!data) return <InlineLoader />;
  const s = data.stats;
  const cards = [
    { label: 'Members', value: String(s.users) },
    { label: 'Total listings', value: String(s.products) },
    { label: 'Available', value: String(s.available) },
    { label: 'Reserved', value: String(s.reserved) },
    { label: 'Sold', value: String(s.sold) },
    { label: 'GMV (sold)', value: formatPrice(s.gmv) },
    { label: 'Listed this week', value: String(s.listedThisWeek) },
    { label: 'Mail', value: data.mail.configured ? 'Live' : 'Dev' },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-card border border-line bg-white p-5">
          <p className="font-serif text-2xl font-semibold text-ink">{c.value}</p>
          <p className="mt-1 text-sm text-ink-muted">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

function Listings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data } = useQuery({
    queryKey: qk.products({ limit: 48 }),
    queryFn: () => productsApi.list({ limit: 48 }),
  });
  const removeMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast('Listing removed', 'success');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const items = data?.items ?? [];
  if (!data) return <InlineLoader />;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {items.map((p, i) => (
        <div
          key={p.id}
          className={cn(
            'flex flex-wrap items-center gap-4 p-4',
            i !== items.length - 1 && 'border-b border-line',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <Link href={`/product/${p.slug}`} className="font-medium text-ink hover:text-brick-700">
              {p.title}
            </Link>
            <p className="text-xs text-ink-faint">
              {p.seller?.name} · {p.category?.name} · {formatPrice(p.price)}
            </p>
          </div>
          <StatusBadge status={p.status} />
          <button
            onClick={() => removeMutation.mutate(p.id)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brick-700 transition-colors hover:bg-brick-50"
          >
            Remove
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="p-8 text-center text-sm text-ink-muted">No listings.</p>}
    </div>
  );
}

function Members() {
  const { data } = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.users });
  if (!data) return <InlineLoader />;
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {data.map((u, i) => (
        <div
          key={u.id}
          className={cn(
            'flex flex-wrap items-center gap-4 p-4',
            i !== data.length - 1 && 'border-b border-line',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">
              {u.name}{' '}
              {u.role === 'ADMIN' && (
                <span className="ml-1 rounded bg-brick-50 px-1.5 py-0.5 text-[10px] font-medium text-brick-700">
                  ADMIN
                </span>
              )}
            </p>
            <p className="text-xs text-ink-faint">
              {u.email} · {u.batch ?? '—'} · {u.hostel ?? '—'}
            </p>
          </div>
          <span className="text-xs text-ink-muted">{u._count.products} listings</span>
          <span className="text-xs text-ink-faint">Joined {memberSince(u.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function BulkEmail() {
  const { data: overview } = useQuery({ queryKey: ['admin-overview'], queryFn: adminApi.overview });
  const { toast } = useToast();
  const [audience, setAudience] = useState('all');
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = useMutation({
    mutationFn: (test: boolean) =>
      adminApi.mail({
        audience,
        customEmails:
          audience === 'custom'
            ? customEmails
                .split(/[\n,]/)
                .map((e) => e.trim())
                .filter(Boolean)
            : undefined,
        subject,
        html: `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#1A1614">${body.replace(/\n/g, '<br/>')}</div>`,
        test,
      }),
    onSuccess: (r) =>
      toast(
        r.configured
          ? `Sent to ${r.recipients} recipient${r.recipients === 1 ? '' : 's'}`
          : `Dev mode — logged ${r.recipients} recipient(s) to server console`,
        'success',
      ),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const input =
    'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick-600/40';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="mb-1 font-serif text-lg text-ink">Compose a bulk email</h2>
        <p className="mb-5 text-sm text-ink-muted">
          {overview?.mail.configured
            ? 'SMTP is live — messages will be delivered.'
            : 'SMTP not configured — messages are logged to the server console (dev mode).'}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Audience</label>
            <select className={input} value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option value="all">All members ({overview?.stats.users ?? '…'})</option>
              {overview?.mail.groups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label} ({g.count})
                </option>
              ))}
              <option value="custom">Custom list…</option>
            </select>
          </div>

          {audience === 'custom' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">
                Email addresses (comma or newline separated)
              </label>
              <textarea
                className={cn(input, 'min-h-[80px] resize-y')}
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="one@iima.ac.in, two@iima.ac.in"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Subject</label>
            <input
              className={input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New on IIMA Marketplace this week"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">Message</label>
            <textarea
              className={cn(input, 'min-h-[180px] resize-y')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement… line breaks are preserved."
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => send.mutate(false)}
              disabled={send.isPending || !subject || !body}
            >
              {send.isPending ? 'Sending…' : 'Send to audience'}
            </Button>
            <Button
              variant="outline"
              onClick={() => send.mutate(true)}
              disabled={send.isPending || !subject || !body}
            >
              Send test to myself
            </Button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-card border border-line bg-sand-50 p-5">
          <h3 className="font-serif text-base text-ink">Mailing groups</h3>
          <p className="mt-1 text-xs text-ink-muted">
            Edit named groups in <code className="text-ink-soft">config/mailingGroups.ts</code>.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {overview?.mail.groups.map((g) => (
              <li key={g.key} className="flex justify-between text-ink-soft">
                <span>{g.label}</span>
                <span className="text-ink-faint">{g.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-dashed border-line bg-white p-5">
          <h3 className="text-sm font-medium text-ink-soft">Automated digests</h3>
          <p className="mt-1 text-sm text-ink-muted">
            Daily / new-listing digests can run on a scheduler using this same engine.
          </p>
          <span className="mt-2 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
            Coming soon
          </span>
        </div>
      </aside>
    </div>
  );
}
