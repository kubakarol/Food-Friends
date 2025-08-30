'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function AppShell({ title, right, children }:{
  title: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md min-h-dvh bg-gradient-to-b from-emerald-50 to-emerald-100/40 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-emerald-100 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-[17px] font-semibold text-emerald-900">{title}</h1>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 animate-[fade_.3s_ease]">{children}</main>
      <BottomNav />
    </div>
  );
}
