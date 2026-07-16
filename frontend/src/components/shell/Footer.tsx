import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

const columns = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Browse all', href: '/marketplace' },
      { label: 'Sell an item', href: '/sell' },
      { label: 'Categories', href: '/marketplace' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'About', href: '/#about' },
      { label: 'Safety & trust', href: '/#features' },
      { label: 'Contact', href: 'https://linktr.ee/my_launchpad', external: true },
      { label: 'Report a listing', href: '/#' },
    ],
  },
  {
    title: 'Coming soon',
    links: [
      { label: 'Loyalty points', href: '/#' },
      { label: 'Campus deals', href: '/#' },
      { label: 'Rentals', href: '/#' },
      { label: 'Lost & found', href: '/#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-sand-50">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            The official student marketplace of IIM Ahmedabad. A trusted, campus-only space to
            buy, sell and exchange.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="eyebrow mb-4">{col.title}</h4>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  {'external' in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ink-muted transition-colors hover:text-brick-700"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-brick-700"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-center sm:flex-row sm:text-left">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-ink-faint sm:justify-start">
            <span>
              Designed &amp; Developed by{' '}
              <a
                href="https://linktr.ee/my_launchpad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-muted underline-offset-2 transition-colors hover:text-brick-700 hover:underline"
              >
                Ankur Kumar
              </a>
            </span>
            <span className="text-line" aria-hidden>
              •
            </span>
            <span>
              Supported by{' '}
              <a
                href="https://students.iima.ac.in/ccc/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-muted underline-offset-2 transition-colors hover:text-brick-700 hover:underline"
              >
                Agile CCC
              </a>
            </span>
            <span className="text-line" aria-hidden>
              •
            </span>
            <span>Crafted for the IIMA Community</span>
          </p>
          <p className="shrink-0 text-xs text-ink-faint">
            Made with <span className="text-brick-600">♥</span> at IIM Ahmedabad
          </p>
        </div>
      </div>
    </footer>
  );
}
