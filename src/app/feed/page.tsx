'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PlaceCard from '@/components/PlaceCard';
import {
  listPlacesInCityByAuthors,
  listPlacesInCityByAuthorsAndDishType,
  Place,
  listAllCities,
  ensureUser,
  listFriends,
  UserDoc,
  listDishTypesForCityAndAuthors,
} from '@/lib/firestore';
import { debounce } from '@/lib/utils';
import { LocateFixed, Loader2 } from 'lucide-react';

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

async function canUseGeolocationSilently() {
  try {
    const p = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    });
    return p.state === 'granted';
  } catch {
    return false;
  }
}

export default function FeedPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const [friends, setFriends] = useState<Array<{ uid: string } & UserDoc>>([]);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  const [dishTypes, setDishTypes] = useState<string[]>([]);
  const [activeDish, setActiveDish] = useState<string>(''); // realny filtr

  const [cities, setCities] = useState<string[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  // auth + podstawowe dane
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          router.replace('/auth/login');
          return;
        }
        setUser(u);

        const d = await ensureUser(u.uid);
        if (d?.displayName) document.title = `Food Friends – ${d.displayName}`;

        setCities(await listAllCities());

        const fr = await listFriends(u.uid);
        setFriends(fr);
        setFriendsLoaded(true);

        const lastCity = localStorage.getItem('ff.city') || '';
        if (lastCity) setCity(lastCity);
      }),
    [router]
  );

async function useMyLocation() {
  sessionStorage.removeItem('ff.geoPaused');
  setGeoLoading(true);

  try {
    // 1) geolokacja (z łapaniem błędów)
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true,
        timeout: 8000,
      })
    );

    const { latitude, longitude } = pos.coords;

    // sanity check
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      console.warn('Geolocation returned invalid coords', pos.coords);
      return;
    }

    // 2) reverse geocoding
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json` +
      `&lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}` +
      `&zoom=10&addressdetails=1`;

    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!r.ok) {
      console.warn('Nominatim reverse failed', r.status);
      return;
    }

    const j = await r.json();

    const guess =
      j?.address?.city ||
      j?.address?.town ||
      j?.address?.village ||
      j?.address?.municipality;

    if (guess) {
      setCity(guess);
      localStorage.setItem('ff.city', guess);
      localStorage.setItem('ff.geoUsed', '1');
    }
  } catch (err: any) {
    // tu trafia GeolocationPositionError
    console.warn('useMyLocation error:', err);

    // opcjonalnie: możesz dać mały komunikat userowi
    // alert('Nie udało się pobrać lokalizacji. Sprawdź ustawienia przeglądarki.');
  } finally {
    setGeoLoading(false);
  }
}


  // cichy auto-geo tylko jeśli user kiedyś kliknął 📍 i przeglądarka ma już "granted"
useEffect(() => {
  if (city) return;

  // jeśli user kliknął X (pauza auto-geo), to nie ustawiaj miasta z lokalizacji
  if (sessionStorage.getItem('ff.geoPaused') === '1') return;

  if (localStorage.getItem('ff.geoUsed') !== '1') return;

void (async () => {
  try {
    if (await canUseGeolocationSilently()) {
      await useMyLocation();
    }
  } catch (e) {
    console.warn('auto-geo failed', e);
  }
})();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [city]);


  // 1) KATEGORIE dla WYBRANEGO miasta (ja + znajomi)
  useEffect(() => {
    (async () => {
      if (!user || !friendsLoaded || !city) {
        setDishTypes([]);
        return;
      }
      const authors = [user.uid, ...friends.map((f) => f.uid)];
      const types = await listDishTypesForCityAndAuthors(city, authors);
      setDishTypes(types);
      // jeśli aktywny filtr nie istnieje w tym mieście, wyczyść
      if (activeDish && !types.includes(activeDish)) setActiveDish('');
    })();
  }, [user, friendsLoaded, friends, city]); // nie dodaję activeDish, żeby nie zapętlać

  // 2) ZAŁADUJ MIEJSCA (ja + znajomi) dla wybranego miasta + aktywnego filtra
  useEffect(() => {
    (async () => {
      if (!user || !friendsLoaded || !city) {
        setLoading(false);
        setPlaces([]);
        return;
      }

      setLoading(true);
      const authors = [user.uid, ...friends.map((f) => f.uid)];

      const data = activeDish
        ? await listPlacesInCityByAuthorsAndDishType(city, authors, activeDish)
        : await listPlacesInCityByAuthors(city, authors);

      setPlaces(data);
      setLoading(false);
    })();
  }, [user, friendsLoaded, friends, city, activeDish]);

  // podpowiedzi miast: jak pusto -> pokaż listę (top 6), jak coś wpisujesz -> filtruj
  const suggestions = useMemo(() => {
    const q = norm(city).trim();
    const base = q
      ? cities.filter((c) => norm(c).startsWith(q) && norm(c) !== q)
      : cities;

    return base.slice(0, 6);
  }, [city, cities]);

  const setCityDebounced = useMemo(
    () =>
      debounce((v: string) => {
        setCity(v);
        localStorage.setItem('ff.city', v);
      }, 150),
    []
  );

  return (
    <AppShell title="Miejsca">
      {/* Miasto + przycisk lokalizacji */}
      <div className="relative mb-3 flex gap-2">
        <div className="relative flex-1">
          <input
            className="w-full border rounded-2xl px-3 py-2 pr-10 border-emerald-200 bg-white"
            value={city}
            onChange={(e) => {
              sessionStorage.removeItem('ff.geoPaused');
              setCityDebounced(e.target.value);
              setCityDropdownOpen(true);
            }}
            onFocus={() => setCityDropdownOpen(true)}
            onBlur={() => setTimeout(() => setCityDropdownOpen(false), 120)}
            placeholder="Miasto (np. Gdańsk)"
            autoComplete="off"
          />

          {!!city && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-emerald-50 flex items-center justify-center"
              aria-label="Wyczyść miasto"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                sessionStorage.setItem('ff.geoPaused', '1');
                setCity('');
                localStorage.removeItem('ff.city');
                setCityDropdownOpen(true);
                setActiveDish('');
              }}
            >
              ×
            </button>
          )}

          {cityDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-xl border border-emerald-200 bg-white shadow-md overflow-hidden z-10">
              {suggestions.map((c) => (
                <button
                  key={c}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    sessionStorage.removeItem('ff.geoPaused');
                    setCity(c);
                    localStorage.setItem('ff.city', c);
                    setCityDropdownOpen(false);
                    setActiveDish('');
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={useMyLocation}
          className="w-10 h-10 rounded-full border border-emerald-200 bg-white flex items-center justify-center hover:bg-emerald-50 active:scale-95 transition disabled:opacity-60"
          disabled={geoLoading}
          aria-label="Użyj mojej lokalizacji"
          title="Użyj mojej lokalizacji"
        >
          {geoLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
          <span className="sr-only">Użyj mojej lokalizacji</span>
        </button>
      </div>

      {/* Kategorie (chipsy) – zależne od miasta */}
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
              title={t}
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
        <p className="text-emerald-700">
          {activeDish ? 'Brak miejsc dla wybranego typu.' : 'Brak miejsc.'}
        </p>
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
