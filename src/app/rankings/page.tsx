'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Dish, Place, UserDoc,
  listAllDishes, listAllPlacesMap, listAllCitiesRaw,
  listAllDishTypesGlobal, getUser
} from '@/lib/firestore';

type RankRow = { label: string; sub?: string; right: string; extra?: string };

function nicePLN(n: number) {
  return n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 });
}

export default function RankingsPage() {
  const [me, setMe] = useState<any>(null);

  // źródła danych
  const [allDishes, setAllDishes] = useState<Dish[]>([]);
  const [placesMap, setPlacesMap] = useState<Map<string, Place>>(new Map());
  const [cities, setCities] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [usersCache, setUsersCache] = useState<Map<string, UserDoc>>(new Map());

  // filtry
  const [year, setYear] = useState<number | 'all'>('all');
  const [city, setCity] = useState<string>('');       // pusty = wszystkie
  const [category, setCategory] = useState<string>(''); // pusty = wszystkie

  // dostępne lata (z całej bazy)
  const yearsAvail = useMemo(() => {
    const s = new Set<number>();
    allDishes.forEach(d => {
      const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
      if (dt) s.add(dt.getFullYear());
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [allDishes]);

  // init auth + pobranie danych
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u);
      const [ds, pm, cs, ts] = await Promise.all([
        listAllDishes(),
        listAllPlacesMap(),
        listAllCitiesRaw(),
        listAllDishTypesGlobal(),
      ]);
      setAllDishes(ds);
      setPlacesMap(pm);
      setCities(cs);
      setTypes(ts);

      // domyślnie rok bieżący, jeśli mamy dane z tego roku
      const curr = new Date().getFullYear();
      const years = new Set<number>();
      ds.forEach(d => {
        const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
        if (dt) years.add(dt.getFullYear());
      });
      if (years.has(curr)) setYear(curr);
    });
    return () => unsub();
  }, []);

  // pomocniczo: dociąganie nazw userów (ranking autorów)
  async function ensureUsers(ids: string[]) {
    const missing = ids.filter(id => !usersCache.has(id));
    if (!missing.length) return;
    const map = new Map(usersCache);
    for (const id of missing) {
      const u = await getUser(id);
      if (u) map.set(id, u);
    }
    setUsersCache(map);
  }

  // przefiltrowane dania wg (rok/miasto/kategoria)
  const dishes = useMemo(() => {
    return allDishes.filter(d => {
      if (year !== 'all') {
        const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
        if (!dt || dt.getFullYear() !== year) return false;
      }
      if (city) {
        const p = placesMap.get(d.placeId);
        if (!p || p.city !== city) return false;
      }
      if (category && d.dishType !== category) return false;
      return true;
    });
  }, [allDishes, year, city, category, placesMap]);

  // ====== RANKINGI ======

  // 1) TOP miejsca w wybranej kategorii – średnia "taste" z dań tej kategorii w danym miejscu
  const rankTopPlacesInCategory: RankRow[] = useMemo(() => {
    if (!category) return [];
    const map = new Map<string, { sum: number; n: number }>();
    dishes.forEach(d => {
      if (d.dishType !== category) return;
      const key = d.placeId;
      const prev = map.get(key) ?? { sum: 0, n: 0 };
      map.set(key, { sum: prev.sum + (d.ratings?.taste ?? 0), n: prev.n + 1 });
    });
    const rows: RankRow[] = Array.from(map.entries()).map(([placeId, { sum, n }]) => {
      const p = placesMap.get(placeId);
      const avg = n ? sum / n : 0;
      return {
        label: p?.name ?? 'Miejsce',
        sub: p?.city,
        right: `${avg.toFixed(2)} / 10`,
        extra: `${n} ${n === 1 ? 'danie' : n < 5 ? 'dania' : 'dań'}`,
      };
    });
    rows.sort((a, b) => {
      const av = parseFloat(b.right) - parseFloat(a.right);
      return av !== 0 ? av : (parseInt((b.extra ?? '0')) - parseInt((a.extra ?? '0')));
    });
    return rows.slice(0, 10);
  }, [dishes, category, placesMap]);

  // 2) TOP dania – najwyższy "taste"
  const rankTopDishes: RankRow[] = useMemo(() => {
    const rows: RankRow[] = dishes.map(d => {
      const p = placesMap.get(d.placeId);
      return {
        label: d.dishName,
        sub: `${p?.name ?? 'Miejsce'} • ${p?.city ?? ''} • ${d.dishType}`,
        right: `${(d.ratings?.taste ?? 0).toFixed(2)} / 10`,
        extra: d.ratings?.price != null ? nicePLN(d.ratings.price) : '—',
      };
    });
    rows.sort((a, b) => parseFloat(b.right) - parseFloat(a.right));
    return rows.slice(0, 10);
  }, [dishes, placesMap]);

  // 3) Cena/Jakość – (taste + portion) / price – uśrednione per miejsce (tylko dania z ceną)
  const rankValueForMoney: RankRow[] = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    dishes.forEach(d => {
      const price = d.ratings?.price;
      if (price == null || price <= 0) return;
      const score = ((d.ratings?.taste ?? 0) + (d.ratings?.portion ?? 0)) / price;
      const key = d.placeId;
      const prev = map.get(key) ?? { sum: 0, n: 0 };
      map.set(key, { sum: prev.sum + score, n: prev.n + 1 });
    });
    const rows: RankRow[] = Array.from(map.entries()).map(([placeId, { sum, n }]) => {
      const p = placesMap.get(placeId);
      const avg = n ? sum / n : 0;
      return {
        label: p?.name ?? 'Miejsce',
        sub: p?.city,
        right: avg.toFixed(3), // wyżej = lepiej
        extra: `${n} danie/dania`,
      };
    });
    rows.sort((a, b) => parseFloat(b.right) - parseFloat(a.right));
    return rows.slice(0, 10);
  }, [dishes, placesMap]);

  // 4) Najaktywniejsi autorzy – liczba dań + średni smak
  const rankTopAuthors: RankRow[] = useMemo(() => {
    const map = new Map<string, { n: number; sumTaste: number }>();
    dishes.forEach(d => {
      const prev = map.get(d.userId) ?? { n: 0, sumTaste: 0 };
      map.set(d.userId, { n: prev.n + 1, sumTaste: prev.sumTaste + (d.ratings?.taste ?? 0) });
    });
    const rows: RankRow[] = Array.from(map.entries()).map(([uid, { n, sumTaste }]) => {
      const u = usersCache.get(uid);
      const avg = n ? sumTaste / n : 0;
      return {
        label: u?.displayName ?? uid.slice(0, 6),
        right: `${n} dań`,
        extra: `śr. smak ${avg.toFixed(2)}`,
      };
    });
    rows.sort((a, b) => {
      const dn = parseInt(b.right) - parseInt(a.right);
      return dn !== 0 ? dn : parseFloat((b.extra ?? '0').split(' ').pop()!) - parseFloat((a.extra ?? '0').split(' ').pop()!);
    });
    return rows.slice(0, 10);
  }, [dishes, usersCache]);

  // dociągnij nazwy userów dla autorów
  useEffect(() => {
    const ids = Array.from(new Set(dishes.map(d => d.userId)));
    ensureUsers(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishes]);

  return (
    <AppShell title="Rankingi">
      {/* FILTRY */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm mb-4 grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Rok
          <select
            className="mt-1 w-full border border-emerald-200 rounded-xl px-3 py-2 bg-white"
            value={year}
            onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Wszystkie</option>
            {yearsAvail.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>

        <label className="text-sm">
          Miasto
          <select
            className="mt-1 w-full border border-emerald-200 rounded-xl px-3 py-2 bg-white"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="text-sm">
          Kategoria
          <select
            className="mt-1 w-full border border-emerald-200 rounded-xl px-3 py-2 bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">— wybierz —</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {/* SEKCJE */}
      <div className="space-y-6">
        <Section
          title={`TOP miejsca${category ? ` – ${category}` : ''}`}
          emptyText={category ? 'Brak danych dla wybranych filtrów.' : 'Wybierz kategorię, aby zobaczyć ranking miejsc.'}
          rows={rankTopPlacesInCategory}
        />

        <Section title="TOP dania (smak)" emptyText="Brak danych dla wybranych filtrów." rows={rankTopDishes} />

        <Section title="Cena / Jakość" emptyText="Brak danych z cenami." rows={rankValueForMoney} />

        <Section title="Najaktywniejsi autorzy" emptyText="Brak danych." rows={rankTopAuthors} />
      </div>
    </AppShell>
  );
}

function Section({ title, rows, emptyText }: { title: string; rows: RankRow[]; emptyText: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-emerald-900 mb-2">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-emerald-700 text-sm">{emptyText}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-emerald-900 truncate">{r.label}</div>
                  {r.sub && <div className="text-xs text-emerald-700 truncate">{r.sub}</div>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-emerald-900">{r.right}</div>
                {r.extra && <div className="text-xs text-emerald-700">{r.extra}</div>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
