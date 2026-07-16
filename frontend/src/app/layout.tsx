import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers/Providers';
import { CustomCursor } from '@/components/landing/CustomCursor';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: {
    default: 'IIMA Marketplace — Campus Buy. Sell. Exchange.',
    template: '%s · IIMA Marketplace',
  },
  description:
    'The official student marketplace of IIM Ahmedabad. Buy, sell, exchange and discover products within campus — safely, among verified students.',
  keywords: ['IIM Ahmedabad', 'marketplace', 'campus', 'students', 'buy', 'sell'],
  authors: [{ name: 'Ankur Kumar' }],
};

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <CustomCursor />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
