'use client';

import { useEffect, useMemo, useState } from 'react';
import { listUserDishes, getPlacesMapByIds, Dish } from '@/lib/firestore';

type Stat = { label: string; value: string };

function nicePLN(n: number) {
  return n.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 });
}

export default function UserStats({ uid }: { uid: string }) {
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cityByPlace, setCityByPlace] = useState<Map<string, string>>(new Map());

  // Lata z danymi + wybrany rok (domyślnie bieżący lub ostatni dostępny)
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    (async () => {
      setLoading(true);

      const ds = await listUserDishes(uid);
      setDishes(ds);

      // mapowanie placeId -> city
      const placeIds = Array.from(new Set(ds.map(d => d.placeId)));
      const placesMap = await getPlacesMapByIds(placeIds);
      const cMap = new Map<string, string>();
      placesMap.forEach(p => cMap.set(p.id!, p.city));
      setCityByPlace(cMap);

      // dostępne lata na podstawie createdAt
      const yearsSet = new Set<number>(); // <— nazwa zmieniona
      ds.forEach(d => {
        const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
        if (dt) yearsSet.add(dt.getFullYear());
      });
      const arr = Array.from(yearsSet).sort((a, b) => b - a); // desc
      setYears(arr);

      // bieżący rok jeśli ma dane; w p.p. ostatni dostępny
      const current = new Date().getFullYear();
      if (arr.includes(current)) setSelectedYear(current);
      else if (arr.length) setSelectedYear(arr[0]);

      setLoading(false);
    })();
  }, [uid]);

  // Dania przefiltrowane po wybranym roku
  const dishesForYear = useMemo(() => {
    return dishes.filter(d => {
      const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
      return dt && dt.getFullYear() === selectedYear;
    });
  }, [dishes, selectedYear]);

  const stats = useMemo(() => {
    const src = dishesForYear;
    const totalDishes = src.length;
    const uniquePlaces = new Set(src.map(d => d.placeId)).size;

    // ceny
    let sum = 0, cnt = 0;
    src.forEach(d => {
      const p = d.ratings?.price;
      if (p != null) { sum += p; cnt++; }
    });

    // smak
    const tasteAvg = src.length
      ? (src.reduce((a, d) => a + (d.ratings?.taste ?? 0), 0) / src.length)
      : 0;

    // top kategorie
    const typeMap = new Map<string, number>();
    src.forEach(d => typeMap.set(d.dishType, (typeMap.get(d.dishType) ?? 0) + 1));
    const topTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // top miasta
    const cityMap = new Map<string, number>();
    src.forEach(d => {
      const c = cityByPlace.get(d.placeId);
      if (!c) return;
      cityMap.set(c, (cityMap.get(c) ?? 0) + 1);
    });
    const topCities = Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // miesięczne wydatki (YYYY-MM) tylko w wybranym roku
    const monthly = new Map<string, number>();
    src.forEach(d => {
      const dt = d.createdAt?.toDate ? (d.createdAt.toDate() as Date) : null;
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const price = d.ratings?.price ?? 0;
      monthly.set(key, (monthly.get(key) ?? 0) + price);
    });
    const monthlyArr = Array.from(monthly.entries()).sort(); // rosnąco

    const summary: Stat[] = [
      { label: 'Restauracje', value: String(uniquePlaces) },
      { label: 'Zjedzone dania', value: String(totalDishes) },
      { label: 'Wydatki (suma)', value: nicePLN(sum) },
      { label: 'Śr. cena dania', value: cnt ? nicePLN(sum / cnt) : '—' },
      { label: 'Śr. smak', value: tasteAvg ? tasteAvg.toFixed(1) + ' / 10' : '—' },
    ];

    return { summary, topTypes, topCities, monthlyArr, totalDishes };
  }, [dishesForYear, cityByPlace]);

  if (loading) return <p className="text-emerald-700">Ładowanie statystyk…</p>;

  return (
    <div className="space-y-4">
      {/* Filtr roku */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-emerald-800">Rok:</label>
        <select
          className="border border-emerald-200 rounded-xl px-3 py-1.5 bg-white text-emerald-900"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {stats.totalDishes === 0 ? (
        <p className="text-emerald-700">
          Brak danych w {selectedYear}. Wybierz inny rok z listy.
        </p>
      ) : (
        <>
          {/* Kafle */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.summary.map((s) => (
              <div key={s.label} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="text-sm text-emerald-700">{s.label}</div>
                <div className="text-2xl font-semibold text-emerald-900 mt-1">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Top kategorie */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="font-semibold mb-2">Najczęściej jedzone kategorie</div>
            <div className="space-y-2">
              {stats.topTypes.map(([type, n]) => (
                <Bar key={type} label={type} value={n} total={stats.totalDishes} />
              ))}
            </div>
          </div>

          {/* Top miasta */}
          {stats.topCities.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="font-semibold mb-2">Najaktywniejsze miasta</div>
              <div className="space-y-2">
                {stats.topCities.map(([city, n]) => (
                  <Bar key={city} label={city} value={n} total={stats.totalDishes} />
                ))}
              </div>
            </div>
          )}

          {/* Wydatki miesięczne */}
          {stats.monthlyArr.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="font-semibold mb-2">Wydatki miesięczne</div>
              <div className="space-y-2">
                {stats.monthlyArr.map(([ym, sum]) => (
                  <div key={ym} className="flex items-center justify-between">
                    <div className="text-emerald-800">{ym}</div>
                    <div className="font-medium">{nicePLN(sum)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Bar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm text-emerald-800">
        <span className="truncate">{label}</span>
        <span>{value} • {pct}%</span>
      </div>
      <div className="h-2 mt-1 rounded-full bg-emerald-100 overflow-hidden">
        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
