'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import {
  getDish, getPlace, updateDish, uploadDishPhotos,
  deleteStorageByUrl, Dish, DishRatings, Place
} from '@/lib/firestore';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';

const DISH_TYPES = ['pizza','ramen','burger','sushi','kebab','salad','pasta','dessert','other'];

// kompresja do webp
async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/webp', quality)
  );
  bitmap.close?.();
  return blob!;
}

type PickedPhoto = { file: File; url: string };

export default function EditDishPage() {
  const params = useParams<{ id: string }>(); // id dania
  const router = useRouter();

  const [me, setMe] = useState<any>(null);
  useEffect(() => onAuthStateChanged(auth, setMe), []);

  const [dish, setDish] = useState<Dish | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  // formularz
  const [dishName, setDishName] = useState('');
  const [dishType, setDishType] = useState('pizza');
  const [priceStr, setPriceStr] = useState('');
  const [queueStr, setQueueStr] = useState('');
  const [ratings, setRatings] = useState<DishRatings>({ taste: 8, portion: 4, service: 4, ambience: 4, queue: 0, price: null });
  const [notes, setNotes] = useState('');

  // zdjęcia
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [toRemove, setToRemove] = useState<Set<number>>(new Set());
  const [newPhotos, setNewPhotos] = useState<PickedPhoto[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const d = await getDish(params.id);
      if (!d) { setLoading(false); return; }
      setDish(d);
      setDishName(d.dishName);
      setDishType(d.dishType);
      setNotes(d.notes || '');
      setExistingPhotos(d.photos || []);
      setRatings(d.ratings);
      setPriceStr(d.ratings.price != null ? String(d.ratings.price) : '');
      setQueueStr(String(d.ratings.queue ?? 0));
      const p = await getPlace(d.placeId);
      setPlace(p);
      setLoading(false);
    })();
  }, [params.id]);

  useEffect(() => {
    return () => newPhotos.forEach(p => URL.revokeObjectURL(p.url));
  }, [newPhotos]);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: PickedPhoto[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue;
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setNewPhotos(prev => [...prev, ...next].slice(0, 12));
  }

  function removeNew(idx: number) {
    setNewPhotos(prev => {
      const copy = [...prev];
      const [rm] = copy.splice(idx, 1);
      if (rm) URL.revokeObjectURL(rm.url);
      return copy;
    });
  }

  function toggleRemoveExisting(idx: number) {
    setToRemove(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dish || !me) return;
    try {
      setSaving(true);
      setErr('');

      const price = priceStr !== '' ? Number(priceStr) : null;
      const queue = queueStr !== '' ? Number(queueStr) : 0;

      // zdjęcia do pozostawienia
      const keep = existingPhotos.filter((_, i) => !toRemove.has(i));
      const removed = existingPhotos.filter((_, i) => toRemove.has(i));

      // upload nowych
      let appended: string[] = [];
      if (newPhotos.length) {
        const blobs = await Promise.all(newPhotos.map(p => compressImage(p.file)));
        appended = await uploadDishPhotos(me.uid, dish.id!, blobs);
      }

      // update dokumentu
      await updateDish(dish.id!, {
        dishName: dishName.trim(),
        dishType: dishType.trim().toLowerCase(),
        ratings: { ...ratings, price, queue },
        notes,
        photos: [...keep, ...appended],
      });

      // nieblokujące kasowanie starych plików w Storage
      removed.forEach((url) => { deleteStorageByUrl(url); });

      router.push(`/place/${dish.placeId}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppShell title="Edytuj danie"><p className="text-emerald-700">Ładowanie…</p></AppShell>;
  if (!dish) return <AppShell title="Edytuj danie"><p>Nie znaleziono dania.</p></AppShell>;

  return (
    <AppShell title={`Edytuj danie: ${place?.name ?? ''}`}>
      <form onSubmit={save} className="space-y-4">
        <input
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          placeholder="Nazwa dania"
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          required
        />

        <select
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          value={dishType}
          onChange={(e) => setDishType(e.target.value)}
        >
          {DISH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            Cena (zł)
            <input
              inputMode="decimal"
              step="0.01"
              className="w-full border rounded-xl px-3 py-2 border-emerald-200"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="np. 19.90"
            />
          </label>
          <label className="text-sm">
            Kolejka (min)
            <input
              inputMode="numeric"
              className="w-full border rounded-xl px-3 py-2 border-emerald-200"
              value={queueStr}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^[0-9]{0,3}$/.test(v)) setQueueStr(v);
              }}
              placeholder="np. 0"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            Smak: <b>{ratings.taste}</b>
            <input type="range" min={1} max={10} value={ratings.taste} onChange={(e) => setRatings(r => ({ ...r, taste: +e.target.value }))} className="w-full" />
          </label>
          <label className="text-sm">
            Porcja: <b>{ratings.portion}</b>
            <input type="range" min={1} max={5} value={ratings.portion} onChange={(e) => setRatings(r => ({ ...r, portion: +e.target.value }))} className="w-full" />
          </label>
          <label className="text-sm">
            Obsługa: <b>{ratings.service}</b>
            <input type="range" min={1} max={5} value={ratings.service} onChange={(e) => setRatings(r => ({ ...r, service: +e.target.value }))} className="w-full" />
          </label>
          <label className="text-sm">
            Atmosfera: <b>{ratings.ambience}</b>
            <input type="range" min={1} max={5} value={ratings.ambience} onChange={(e) => setRatings(r => ({ ...r, ambience: +e.target.value }))} className="w-full" />
          </label>
        </div>

        <textarea
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          rows={3}
          placeholder="Uwagi"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* zdjęcia istniejące */}
        {existingPhotos.length > 0 && (
          <div>
            <div className="text-sm mb-1">Zdjęcia — kliknij „Usuń”, aby wykluczyć z zapisu</div>
            <div className="flex gap-2 flex-wrap">
              {existingPhotos.map((u, i) => (
                <div key={i} className={`relative ${toRemove.has(i) ? 'opacity-50' : ''}`}>
                  <img src={u} className="h-20 w-20 object-cover rounded-lg border border-emerald-100" alt="" />
                  <button
                    type="button"
                    onClick={() => toggleRemoveExisting(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-white/90 border shadow p-1 text-xs"
                  >
                    {toRemove.has(i) ? '↩︎' : '✕'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* nowe zdjęcia */}
        <div className="rounded-xl border-2 border-dashed border-emerald-200 p-4 bg-emerald-50/30">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-emerald-800">Dodaj kolejne zdjęcia (opcjonalnie)</div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1 rounded-lg border border-emerald-200 bg-white text-emerald-700"
            >
              Wybierz pliki
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          {newPhotos.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {newPhotos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p.url} className="h-20 w-20 object-cover rounded-lg border border-emerald-100" alt="" />
                  <button
                    type="button"
                    onClick={() => removeNew(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-white/90 border shadow p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div className="flex gap-2">
          <button disabled={saving} className="flex-1 rounded-xl bg-emerald-600 text-white py-3 font-semibold disabled:opacity-60">
            Zapisz zmiany
          </button>
          <button type="button" className="px-4 rounded-xl border" onClick={() => router.back()}>
            Anuluj
          </button>
        </div>
      </form>
    </AppShell>
  );
}
