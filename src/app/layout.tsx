import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Food Friends',
  description: 'Twoje miejsca z jedzeniem, oceny i rankingi.',
  manifest: '/manifest.webmanifest',
  icons: [{ rel: 'icon', url: '/icons/foodFriends.png'}, {rel: 'apple-touch-icon', url: '/icons/apple-touch-icon.png', sizes: '180x180'}]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
        <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Food Friends" />
      </head>
      <body className="bg-emerald-50/40">{children}</body>
    </html>
  );
}
