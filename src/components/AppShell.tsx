'use client';

import { ReactNode } from 'react';
import BottomNav from './BottomNav';

export default function AppShell({ title, right, children }:{
  title: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.55),transparent_34%),linear-gradient(180deg,#ecfdf5_0%,#f7fee7_46%,#ecfdf5_100%)] text-emerald-950">
      <header className="sticky top-0 z-10 border-b border-emerald-100/80 bg-white/85 shadow-[0_8px_24px_rgba(6,78,59,0.06)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-3.5">
          <h1 className="min-w-0 truncate text-[18px] font-semibold tracking-tight text-emerald-950">{title}</h1>
          <div className="flex shrink-0 items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="min-w-0 max-w-full flex-1 overflow-x-hidden px-3 py-4 pb-24 sm:px-4 animate-[fade_.3s_ease]">{children}</main>
      <BottomNav />
    </div>
  );
}
