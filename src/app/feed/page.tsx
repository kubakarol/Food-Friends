'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PlaceCard from '@/components/PlaceCard';
import {
  listPlacesInCityByAuthors, Place, listAllCities, ensureUser,
  listFriends, UserDoc, listDishTypesForUser
} from '@/lib/firestore';
import { debounce } from '@/lib/utils';
import { LocateFixed, Loader2 } from 'lucide-react';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function FeedPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState('');              // stabilny SSR
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const [friends, setFriends] = useState<Array<{ uid: string } & UserDoc>>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  const [dishTypes, setDishTypes] = useState<string[]>([]);
  const [activeDish, setActiveDish] = useState<string>(''); // (na razie tylko UI)

  const [cities, setCities] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const geoTriedRef = useRef(false);

  useEffect(() =>
    onAuthStateChanged(auth, async (u) => {
      if (!u) { router.replace('/auth/login'); return; }
      setUser(u);

      const d = await ensureUser(u.uid);
      if (d?.displayName) document.title = `Food Friends – ${d.displayName}`;

      setCities(await listAllCities());
      setDishTypes(await listDishTypesForUser(u.uid));

      const fr = await listFriends(u.uid);
      setFriends(fr);
      setFriendsLoaded(true);

      const lastCity = localStorage.getItem('ff.city') || '';
      if (lastCity) setCity(lastCity);
    }), [router]
  );

  // auto-geo raz, tylko gdy nie ma miasta
  useEffect(() => {
    if (!city && !geoTriedRef.current) {
      geoTriedRef.current = true;
      void useMyLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // załaduj miejsca (ja + znajomi)
  useEffect(() => {
    (async () => {
      if (!user || !friendsLoaded || !city) { setLoading(false); return; }
      setLoading(true);
      const authors = [user.uid, ...friends.map((f) => f.uid)];
      const data = await listPlacesInCityByAuthors(city, authors);
      setPlaces(data);
      setLoading(false);
    })();
  }, [user, friendsLoaded, friends, city]);

  // podpowiedzi miast
  const suggestions = useMemo(() => {
    const q = norm(city);
    return cities.filter((c) => norm(c).startsWith(q) && norm(c) !== q).slice(0, 6);
  }, [city, cities]);

  const setCityDebounced = useMemo(
    () => debounce((v: string) => {
      setCity(v);
      localStorage.setItem('ff.city', v);
    }, 150),
    []
  );

  async function useMyLocation() {
    try {
      setGeoLoading(true);
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 8000,
        })
      );
      const { latitude, longitude } = pos.coords;
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const j = await r.json();
      const guess =
        j.address.city || j.address.town || j.address.village || j.address.municipality;
      if (guess) {
        setCity(guess);
        localStorage.setItem('ff.city', guess);
      }
    } finally {
      setGeoLoading(false);
    }
  }

  return (
    <AppShell title="Miejsca">
      {/* Miasto + przycisk lokalizacji */}
      <div className="relative mb-3 flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full border rounded-2xl px-3 py-2 border-emerald-200 bg-white"
            value={city}
            onChange={(e) => setCityDebounced(e.target.value)}
            placeholder="Miasto (np. Gdańsk)"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl border border-emerald-200 bg-white shadow-md overflow-hidden z-10">
              {suggestions.map((c) => (
                <button
                  key={c}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50"
                  onClick={() => {
                    setCity(c);
                    localStorage.setItem('ff.city', c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 📍 ikona lucide-react */}
        <button
          onClick={useMyLocation}
          className="w-10 h-10 rounded-full border border-emerald-200 bg-white flex items-center justify-center hover:bg-emerald-50 active:scale-95 transition disabled:opacity-60"
          disabled={geoLoading}
          aria-label="Użyj mojej lokalizacji"
          title="Użyj mojej lokalizacji"
        >
          {geoLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
          <span className="sr-only">Użyj mojej lokalizacji</span>
        </button>
      </div>

      {/* (opcjonalnie) Twoje typy dań jako tagi */}
      {dishTypes.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button
            onClick={() => setActiveDish('')}
            className={`px-3 py-1 rounded-full border ${
              activeDish === ''
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'border-emerald-200 text-emerald-700'
            }`}
          >
            Wszystkie
          </button>
          {dishTypes.map((t) => (
            <button
              key={t}
              onClick={() => setActiveDish(t)}
              className={`px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 ${
                activeDish === t ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {(!city || loading) ? (
        <p className="text-emerald-700">
          {city ? 'Ładowanie…' : 'Podaj miasto lub użyj 📍.'}
        </p>
      ) : places.length === 0 ? (
        <p className="text-emerald-700">Brak miejsc.</p>
      ) : (
        <div className="grid gap-3">
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
