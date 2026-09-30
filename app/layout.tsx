import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SiteAnalytics from './site-analytics';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bmf.example'),
  title: 'BMF | Votre solution de jeux',
  description: 'Plateforme gaming moderne pour recharges Free Fire et cartes cadeaux numériques.',
  applicationName: 'BMF',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BMF',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <SiteAnalytics />
        {children}
      </body>
    </html>
  );
}
