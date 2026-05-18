'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function AppShell({ title, right, children }:{
  title: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.55),transparent_34%),linear-gradient(180deg,#ecfdf5_0%,#f7fee7_46%,#ecfdf5_100%)] text-emerald-950">
      <header className="sticky top-0 z-10 border-b border-emerald-100/80 bg-white/85 shadow-[0_8px_24px_rgba(6,78,59,0.06)] backdrop-blur-xl">
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-[18px] font-semibold tracking-tight text-emerald-950">{title}</h1>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="flex-1 px-4 py-4 pb-6 animate-[fade_.3s_ease]">{children}</main>
      <BottomNav />
    </div>
  );
}
