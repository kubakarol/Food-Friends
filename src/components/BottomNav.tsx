'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Home, PlusCircle, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/feed', label: 'Miejsca', icon: Home },
  { href: '/add', label: 'Dodaj', icon: PlusCircle },
  { href: '/rankings', label: 'Rankingi', icon: Trophy },
  { href: '/profile', label: 'Profil', icon: User }
];

export default function BottomNav() {
  const pathname = usePathname(); const router = useRouter();
  return (
    <nav className="sticky bottom-0 z-10 border-t border-emerald-100/80 bg-white/90 backdrop-blur-xl shadow-[0_-10px_24px_rgba(6,78,59,0.06)]">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl py-2 text-xs font-medium transition',
                active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100' : 'text-emerald-500 hover:bg-emerald-50/70 hover:text-emerald-700'
              )}
            >
              <Icon size={22} strokeWidth={2} />
              <span className="mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
