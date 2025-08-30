'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';
import { addPlace } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function AddPlacePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => { if (!u) router.replace('/auth/login'); else setUser(u); }), [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      await addPlace({ name, city, mapsUrl: mapsUrl || null, createdBy: user.uid });
      router.push('/feed');
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  if (!user) return <div className="p-6">Ładowanie…</div>;

  return (
    <AppShell title="Dodaj miejsce">
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Nazwa</label>
          <input className="w-full border rounded-xl px-3 py-2 border-emerald-200" value={name} onChange={e=>setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Miasto</label>
          <input className="w-full border rounded-xl px-3 py-2 border-emerald-200" value={city} onChange={e=>setCity(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Link do Google Maps (opcjonalnie)</label>
          <input className="w-full border rounded-xl px-3 py-2 border-emerald-200" value={mapsUrl} onChange={e=>setMapsUrl(e.target.value)} />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button disabled={saving}
          className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold shadow-sm disabled:opacity-60">
          Zapisz miejsce
        </button>
      </form>
    </AppShell>
  );
}
