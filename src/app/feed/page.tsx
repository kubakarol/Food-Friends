'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PlaceCard from '@/components/PlaceCard';
import { listPlacesByCity, Place } from '@/lib/firestore';

import { db } from '@/lib/firebase.client';
import { addDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [city, setCity] = useState<string>('Gdańsk');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() =>
    onAuthStateChanged(auth, (u) => {
      if (!u) router.replace('/auth/login');
      else setUser(u);
    }), [router]
  );

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      const data = await listPlacesByCity(city);
      setPlaces(data);
      setLoading(false);
    })();
  }, [user, city]);

  async function testDb() {
    if (!user) return;
    const ref = await addDoc(collection(db, 'debug'), {
      createdAt: Timestamp.now(), by: user.uid, note: 'Hello from Food Friends'
    });
    const q = query(collection(db, 'debug'), where('by', '==', user.uid));
    const snap = await getDocs(q);
    alert(`Zapisano ${ref.id}. Twoich rekordów: ${snap.size}`);
  }

  const headerRight = useMemo(() => (
    <>
      <button onClick={testDb} className="rounded-lg border px-3 py-1 text-sm">Test DB</button>
      <button onClick={()=>signOut(auth)} className="rounded-lg bg-red-600 text-white px-3 py-1 text-sm">Wyloguj</button>
    </>
  ), []);

  if (!user) return <div className="p-6">Ładowanie…</div>;

  return (
    <AppShell title="Miejsca" right={headerRight}>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 border rounded-xl px-3 py-2"
          value={city} onChange={e=>setCity(e.target.value)} placeholder="Miasto"
        />
        <button
          onClick={()=>router.push('/add')}
          className="rounded-xl bg-black text-white px-4 font-medium"
        >Dodaj</button>
      </div>

      {loading ? (
        <p className="text-zinc-500">Ładowanie…</p>
      ) : places.length === 0 ? (
        <p className="text-zinc-500">Brak miejsc — dodaj pierwsze!</p>
      ) : (
        <div className="grid gap-3">
          {places.map(p => <PlaceCard key={p.id} place={p} />)}
        </div>
      )}
    </AppShell>
  );
}
