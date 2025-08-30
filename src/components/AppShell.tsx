'use client';

import { ReactNode } from 'react';
import BottomNav from '../components/BottomNav';

export default function AppShell({ title, right, children }: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md min-h-dvh bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4">{children}</main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
