'use client';

import { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { addPlace } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function AddPlacePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const savingRef = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (u) => { if (!u) router.replace('/auth/login'); else setUser(u); }), [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || savingRef.current) return;
    try {
      savingRef.current = true;
      setSaving(true);
      setErr('');
      await addPlace({ name, city, mapsUrl: mapsUrl || null, createdBy: user.uid });
      router.push('/feed');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Nie udało się zapisać miejsca.');
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!user) return <div className="p-6">Ładowanie…</div>;

  return (
    <AppShell title="Dodaj miejsce">
      <form onSubmit={save} className="ff-card space-y-4">
        <div>
          <label className="ff-label">Nazwa</label>
          <input className="ff-input" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="ff-label">Miasto</label>
          <input className="ff-input" value={city} onChange={e=>setCity(e.target.value)} required />
        </div>
        <div>
          <label className="ff-label">Link do Google Maps (opcjonalnie)</label>
          <input className="ff-input" value={mapsUrl} onChange={e=>setMapsUrl(e.target.value)} />
        </div>

        {err && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">{err}</p>}

        <button disabled={saving}
          className="ff-button-primary w-full py-3">
          Zapisz miejsce
        </button>
      </form>
    </AppShell>
  );
}
