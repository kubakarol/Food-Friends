'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const touchY = useRef<number | null>(null);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      const nearTop = y < 24;
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 24;

      if (nearTop || nearBottom || delta < 0) {
        setHidden(false);
      } else if (delta > 4 && y > 80) {
        setHidden(true);
      }

      lastY.current = y;
    }

    function onTouchStart(e: TouchEvent) {
      touchY.current = e.touches[0]?.clientY ?? null;
    }

    function onTouchMove(e: TouchEvent) {
      if (touchY.current == null) return;

      const currentY = e.touches[0]?.clientY;
      if (currentY == null) return;

      const delta = currentY - touchY.current;
      const y = window.scrollY;
      const nearTop = y < 24;
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 24;

      if (nearTop || nearBottom || delta > 6) {
        setHidden(false);
      } else if (delta < -8 && y > 80) {
        setHidden(true);
      }

      touchY.current = currentY;
      lastY.current = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-1/2 z-50 w-full max-w-md border-t border-emerald-100/80 bg-white/90 backdrop-blur-xl shadow-[0_-10px_24px_rgba(6,78,59,0.06)] transition-transform duration-200 ease-out',
        hidden ? '-translate-x-1/2 translate-y-full' : '-translate-x-1/2 translate-y-0'
      )}
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-4 px-2 py-1.5">
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
