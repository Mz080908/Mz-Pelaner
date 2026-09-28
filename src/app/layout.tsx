import type { Metadata } from 'next';
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google';
import '@/app/globals.css';
import { Providers } from './providers';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'], display: 'swap' });
const vazir = Vazirmatn({ variable: '--font-vazir', subsets: ['latin', 'arabic'], display: 'swap', weight: ['300', '400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Mz Planer',
  description: 'A premium personal productivity app.',
};

export const viewport = {
  themeColor: '#0f1218',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazir.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col bg-mzbg text-mzink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}