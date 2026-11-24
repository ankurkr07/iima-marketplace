import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';

const columns = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse all listings', href: '/marketplace' },
      { label: 'Items for rent', href: '/marketplace?type=RENTAL' },
      { label: 'Sell or rent an item', href: '/sell' },
      { label: 'Your wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Manage listings', href: '/dashboard?tab=My+listings' },
      { label: 'Profile & notifications', href: '/dashboard?tab=Settings' },
    ],
  },
  {
    title: 'IIMA Community',
    links: [
      { label: "Students' Portal", href: 'https://students.iima.ac.in/', external: true },
      { label: 'About Agile CCC', href: 'https://students.iima.ac.in/ccc/', external: true },
      { label: 'Contact & feedback', href: 'https://linktr.ee/my_launchpad', external: true },
    ],
  },
];

const PROMISES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'shield', title: 'Verified students only', text: 'Every member signs in with an @iima.ac.in account.' },
  { icon: 'pin', title: 'Meet on campus', text: 'Hand over in a dorm, the LKP or the main gate.' },
  { icon: 'chat', title: 'Talk directly', text: 'WhatsApp, call or email — no middlemen, no fees.' },
];

export function Footer() {
  return (
    <footer className="mt-24 bg-ink text-sand-200">
      <div className="border-b border-white/10">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p.title} className="flex items-start gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-gold-soft ring-1 ring-white/10">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-sand-300/70">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <span className="inline-flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" />
            <span className="leading-tight">
              <span className="block font-serif text-lg font-semibold text-white">IIMA Marketplace</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-sand-300/60">
                Campus Buy · Sell · Rent
              </span>
            </span>
          </span>
          <p className="mt-4 text-sm leading-relaxed text-sand-300/70">
            The official student marketplace of IIM Ahmedabad — a trusted, campus-only space to pass on
            what you no longer need.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-soft">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {'external' in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-sand-300/80 transition-colors hover:text-white"
                    >
                      {link.label}
                      <Icon name="arrowUpRight" className="h-3 w-3 opacity-60" />
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-sand-300/80 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-center text-xs text-sand-300/60 sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} IIMA Marketplace · Built by{' '}
            <a
              href="https://students.iima.ac.in/ccc/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-sand-200 underline-offset-2 hover:underline"
            >
              Agile CCC
            </a>
          </p>
          <p>
            Made with <span className="text-brick-400">♥</span> at IIM Ahmedabad
          </p>
        </div>
      </div>
    </footer>
  );
}
