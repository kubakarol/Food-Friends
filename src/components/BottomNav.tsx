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
    <nav className="sticky bottom-0 z-10 border-t border-emerald-100 bg-white">
      <div className="mx-auto max-w-md grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={cn(
                'flex flex-col items-center justify-center py-2 text-xs transition',
                active ? 'text-emerald-700' : 'text-emerald-500 hover:text-emerald-700'
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
