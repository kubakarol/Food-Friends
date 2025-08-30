import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Food Friends',
  description: 'Twoje miejsca z jedzeniem, oceny i rankingi.',
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/icons/icon-192.png' }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-zinc-50">{children}</body>
    </html>
  );
}
