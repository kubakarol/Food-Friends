'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';
import AppShell from '@/components/AppShell';
import { addDish, getPlace, uploadDishPhotos, getUser } from '@/lib/firestore';

const DISH_TYPES = ['pizza','ramen','burger','sushi','kebab','salad','pasta','dessert','other'];

// ---- kompresja do webp, max 1600px ----
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
  return blob;
}

type PickedPhoto = { file: File; url: string };

export default function AddDishPage() {
  const params = useParams<{id: string}>();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [authorName, setAuthorName] = useState('');
  const [placeName, setPlaceName] = useState('');

  const [dishName, setDishName] = useState('');
  const [dishType, setDishType] = useState('pizza');

  // stringi, by pozwolić na pustą wartość i usuwanie „0”
  const [priceStr, setPriceStr] = useState<string>(''); // np. "19.90"
  const [queueStr, setQueueStr] = useState<string>(''); // np. "0" albo ""

  const [taste, setTaste] = useState(8);
  const [portion, setPortion] = useState(4);
  const [service, setService] = useState(4);
  const [ambience, setAmbience] = useState(4);

  const [notes, setNotes] = useState('');

  // wybrane zdjęcia + podglądy
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // auth + autor
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) {
          router.replace('/auth/login');
          return;
        }
        setUser(u);
        const ud = await getUser(u.uid);
        setAuthorName(ud?.displayName || (u.email ?? ''));
      }),
    [router]
  );

  // nazwa miejsca
  useEffect(() => {
    (async () => {
      const p = await getPlace(params.id);
      setPlaceName(p?.name ?? '');
    })();
  }, [params.id]);

  // sprzątanie URL.createObjectURL
  useEffect(() => {
    return () => {
      photos.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const next: PickedPhoto[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith('image/')) continue; // tylko obrazy
      const url = URL.createObjectURL(f);
      next.push({ file: f, url });
    }
    // limit np. 12 zdjęć
    setPhotos(prev => [...prev, ...next].slice(0, 12));
  }

  function removePhoto(idx: number) {
    setPhotos(prev => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      setErr('');

      const price = priceStr !== '' ? Number(priceStr) : null;
      const queue = queueStr !== '' ? Number(queueStr) : 0;

      const dishId = await addDish({
        placeId: params.id,
        userId: user.uid,
        authorName,
        dishName,
        dishType,
        ratings: { taste, portion, service, ambience, queue, price },
        notes,
        photos: [],
      });

      // upload zdjęć (po kompresji)
      if (photos.length) {
        const blobs = await Promise.all(photos.map(p => compressImage(p.file)));
        await uploadDishPhotos(user.uid, dishId, blobs);
      }

      router.push(`/place/${params.id}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  // drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  return (
    <AppShell title={`Dodaj danie: ${placeName}`}>
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
          {DISH_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
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
            Smak: <b>{taste}</b>
            <input type="range" min={1} max={10} value={taste} onChange={(e) => setTaste(+e.target.value)} className="w-full" />
          </label>
          <label className="text-sm">
            Porcja: <b>{portion}</b>
            <input type="range" min={1} max={5} value={portion} onChange={(e) => setPortion(+e.target.value)} className="w-full" />
          </label>
          <label className="text-sm">
            Obsługa: <b>{service}</b>
            <input type="range" min={1} max={5} value={service} onChange={(e) => setService(+e.target.value)} className="w-full" />
          </label>
          <label className="text-sm">
            Atmosfera: <b>{ambience}</b>
            <input type="range" min={1} max={5} value={ambience} onChange={(e) => setAmbience(+e.target.value)} className="w-full" />
          </label>
        </div>

        <textarea
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          rows={3}
          placeholder="Uwagi (opcjonalnie)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Uploader z podglądem i DnD */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed border-emerald-200 p-4 bg-emerald-50/30"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-emerald-800">
              Zdjęcia (opcjonalnie) – przeciągnij tutaj albo wybierz z dysku.
            </div>
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

          {photos.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img
                    src={p.url}
                    className="h-20 w-20 object-cover rounded-lg border border-emerald-100"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 rounded-full bg-white/90 border shadow p-1 text-xs"
                    aria-label="Usuń zdjęcie"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          disabled={saving}
          className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold disabled:opacity-60"
        >
          Zapisz danie
        </button>
      </form>
    </AppShell>
  );
}
