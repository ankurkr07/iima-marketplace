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

const emailInput =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brick-600/40';

/** Audience <select> shared by the composer and the digest sender. */
function AudienceSelect({
  value,
  onChange,
  groups,
  totalUsers,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: { id: string; label: string; count: number }[];
  totalUsers?: number;
}) {
  return (
    <select className={emailInput} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All members ({totalUsers ?? '…'})</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.label} ({g.count})
        </option>
      ))}
      <option value="custom">Custom list…</option>
    </select>
  );
}

function BulkEmail() {
  const { data: overview } = useQuery({ queryKey: ['admin-overview'], queryFn: adminApi.overview });
  const { data: groups } = useQuery({ queryKey: ['admin-groups'], queryFn: adminApi.groups });
  const { toast } = useToast();
  const [audience, setAudience] = useState('all');
  const [customEmails, setCustomEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const parseCustom = () =>
    audience === 'custom'
      ? customEmails.split(/[\n,]/).map((e) => e.trim()).filter(Boolean)
      : undefined;

  const send = useMutation({
    mutationFn: (test: boolean) =>
      adminApi.mail({
        audience,
        customEmails: parseCustom(),
        subject,
        body,
        cta: ctaLabel && ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="rounded-card border border-line bg-white p-6">
          <h2 className="mb-1 font-serif text-lg text-ink">Compose a bulk email</h2>
          <p className="mb-5 text-sm text-ink-muted">
            {overview?.mail.configured
              ? 'SMTP is live — messages will be delivered, wrapped in the branded template.'
              : 'SMTP not configured — messages are logged to the server console (dev mode).'}
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Audience</label>
              <AudienceSelect
                value={audience}
                onChange={setAudience}
                groups={groups ?? []}
                totalUsers={overview?.stats.users}
              />
            </div>

            {audience === 'custom' && (
              <textarea
                className={cn(emailInput, 'min-h-[80px] resize-y')}
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="one@iima.ac.in, two@iima.ac.in"
              />
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Subject</label>
              <input
                className={emailInput}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="New on IIMA Marketplace this week"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-soft">Message</label>
              <textarea
                className={cn(emailInput, 'min-h-[160px] resize-y')}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your announcement… line breaks are preserved."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className={emailInput}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Button label (optional)"
              />
              <input
                className={emailInput}
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="Button link, e.g. https://…"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => send.mutate(false)} disabled={send.isPending || !subject || !body}>
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

        <DigestSender groups={groups ?? []} totalUsers={overview?.stats.users} />
      </div>

      <GroupsManager />
    </div>
  );
}

/** Send a "new listings" digest immediately, and show how to automate it. */
function DigestSender({
  groups,
  totalUsers,
}: {
  groups: { id: string; label: string; count: number }[];
  totalUsers?: number;
}) {
  const { toast } = useToast();
  const [audience, setAudience] = useState('all');
  const [sinceDays, setSinceDays] = useState(7);

  const digest = useMutation({
    mutationFn: (test: boolean) => adminApi.digest({ audience, sinceDays, test }),
    onSuccess: (r) =>
      toast(
        r.recipients === 0
          ? `No new items in that window (or no recipients).`
          : `Digest of ${r.items} item(s) sent to ${r.recipients} recipient(s).`,
        r.recipients === 0 ? 'info' : 'success',
      ),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  return (
    <section className="rounded-card border border-line bg-white p-6">
      <h2 className="mb-1 font-serif text-lg text-ink">New-listings digest</h2>
      <p className="mb-5 text-sm text-ink-muted">
        Send a roundup of items listed recently. Trigger it here, or automate it via
        <code className="mx-1 text-ink-soft">POST /api/v1/mail/cron/digest</code>
        from any scheduler.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Audience</label>
          <AudienceSelect value={audience} onChange={setAudience} groups={groups} totalUsers={totalUsers} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Items from last</label>
          <select
            className={emailInput}
            value={sinceDays}
            onChange={(e) => setSinceDays(Number(e.target.value))}
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={() => digest.mutate(false)} disabled={digest.isPending || audience === 'custom'}>
          {digest.isPending ? 'Sending…' : 'Send digest now'}
        </Button>
        <Button variant="outline" onClick={() => digest.mutate(true)} disabled={digest.isPending}>
          Send test to myself
        </Button>
      </div>
    </section>
  );
}

/** Create/delete mailing groups and manage their addresses — no code edits. */
function GroupsManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: groups } = useQuery({ queryKey: ['admin-groups'], queryFn: adminApi.groups });
  const [newGroup, setNewGroup] = useState('');
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-groups'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const create = useMutation({
    mutationFn: () => adminApi.createGroup(newGroup.trim()),
    onSuccess: () => {
      setNewGroup('');
      refresh();
      toast('Group created', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const del = useMutation({
    mutationFn: (id: string) => adminApi.deleteGroup(id),
    onSuccess: () => {
      refresh();
      toast('Group deleted', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  return (
    <aside className="space-y-4">
      <div className="rounded-card border border-line bg-sand-50 p-5">
        <h3 className="font-serif text-base text-ink">Mailing groups</h3>
        <p className="mt-1 text-xs text-ink-muted">Create groups and add addresses — all from here.</p>

        <div className="mt-3 flex gap-2">
          <input
            className={emailInput}
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            placeholder="New group name"
            onKeyDown={(e) => e.key === 'Enter' && newGroup.trim() && create.mutate()}
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending || !newGroup.trim()}>
            Add
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {(groups ?? []).length === 0 && (
            <p className="text-sm text-ink-faint">No groups yet — create one above.</p>
          )}
          {(groups ?? []).map((g) => (
            <GroupCard key={g.id} group={g} onChanged={refresh} onDelete={() => del.mutate(g.id)} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function GroupCard({
  group,
  onChanged,
  onDelete,
}: {
  group: { id: string; label: string; count: number; emails: string[] };
  onChanged: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const add = useMutation({
    mutationFn: () => adminApi.addEmail(group.id, email.trim()),
    onSuccess: () => {
      setEmail('');
      onChanged();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const remove = useMutation({
    mutationFn: (addr: string) => adminApi.removeEmail(group.id, addr),
    onSuccess: onChanged,
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">
          {group.label} <span className="text-ink-faint">· {group.count}</span>
        </span>
        <button
          onClick={onDelete}
          className="text-xs text-brick-600 hover:underline"
          aria-label={`Delete ${group.label}`}
        >
          Delete
        </button>
      </div>
      {group.emails.length > 0 && (
        <ul className="mt-2 space-y-1">
          {group.emails.map((e) => (
            <li key={e} className="flex items-center justify-between text-xs text-ink-soft">
              <span className="truncate">{e}</span>
              <button
                onClick={() => remove.mutate(e)}
                className="ml-2 shrink-0 text-ink-faint hover:text-brick-600"
                aria-label={`Remove ${e}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          className={cn(emailInput, 'py-1.5 text-xs')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="add@iima.ac.in"
          onKeyDown={(e) => e.key === 'Enter' && email.trim() && add.mutate()}
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending || !email.trim()} className="px-3 py-1.5 text-xs">
          Add
        </Button>
      </div>
    </div>
  );
}
