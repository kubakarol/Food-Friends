import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Food Friends',
  description: 'Twoje miejsca z jedzeniem, oceny i rankingi.',
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/icons/foodFriends.png' }]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-emerald-50/40">{children}</body>
    </html>
  );
}
