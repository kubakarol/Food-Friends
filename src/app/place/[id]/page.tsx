'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getPlace, listDishesForPlace, Dish, Place, updateDish, deleteDish } from '@/lib/firestore';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged } from 'firebase/auth';

type ViewerState = { open: boolean; list: string[]; index: number };

export default function PlaceDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [me, setMe] = useState<any>(null);
  useEffect(() => onAuthStateChanged(auth, setMe), []);

  const [place, setPlace] = useState<Place | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  // lightbox
  const [viewer, setViewer] = useState<ViewerState>({ open: false, list: [], index: 0 });

  // edycja notes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getPlace(params.id);
      setPlace(p);
      const d = await listDishesForPlace(params.id);
      setDishes(d);
      setLoading(false);
    })();
  }, [params.id]);

  // klawiatura dla lightboxa
  useEffect(() => {
    if (!viewer.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(v => ({ ...v, open: false }));
      if (e.key === 'ArrowRight') setViewer(v => ({ ...v, index: (v.index + 1) % v.list.length }));
      if (e.key === 'ArrowLeft')  setViewer(v => ({ ...v, index: (v.index - 1 + v.list.length) % v.list.length }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer.open, viewer.list.length]);

  async function saveNotes() {
    if (!editingId) return;
    await updateDish(editingId, { notes: editNotes });
    setDishes(ds => ds.map(d => d.id === editingId ? { ...d, notes: editNotes } : d));
    setEditingId(null);
  }

  async function removeDish(id: string) {
    if (!confirm('Na pewno usunąć to danie?')) return;
    await deleteDish(id);
    setDishes(ds => ds.filter(d => d.id !== id));
  }

  return (
    <AppShell
      title={place?.name ?? 'Miejsce'}
      right={
        <button
          onClick={() => router.push(`/place/${params.id}/add-dish`)}
          className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-sm"
        >
          Dodaj danie
        </button>
      }
    >
      {loading ? (
        <p className="text-emerald-700">Ładowanie…</p>
      ) : !place ? (
        <p>Nie znaleziono miejsca.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm mb-4">
            <div className="font-semibold text-emerald-900">{place.name}</div>
            <div className="text-emerald-600">{place.city}</div>
            {place.mapsUrl && (
              <a href={place.mapsUrl} target="_blank" className="text-sky-700 underline mt-2 inline-block">
                Mapa
              </a>
            )}
          </div>

          <h2 className="font-semibold mb-2">Zjedzone dania</h2>
          {dishes.length === 0 ? (
            <p className="text-emerald-700">Brak dań — dodaj pierwsze.</p>
          ) : (
            <ul className="space-y-2">
              {dishes.map((d) => (
                <li key={d.id} className="rounded-xl border border-emerald-100 bg-white p-3">
                  {/* nagłówek */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {d.dishName}{' '}
                        <span className="text-emerald-600 text-sm">({d.dishType})</span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {d.authorName} • {d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : ''}
                      </div>
                    </div>

                    {/* akcje właściciela */}
                    {me?.uid === d.userId && (
                    <div className="shrink-0 flex gap-2">
                        <button
                        onClick={() => router.push(`/dish/${d.id}/edit`)}
                        className="text-emerald-700 text-sm underline"
                        >
                        Edytuj
                        </button>
                        <button
                        onClick={() => removeDish(d.id!)}
                        className="text-red-600 text-sm underline"
                        >
                        Usuń
                        </button>
                    </div>
                    )}

                  </div>

                  {d.ratings?.price != null && (
                    <div className="text-sm text-emerald-700 mt-1">{d.ratings.price.toFixed(2)} zł</div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Smak {d.ratings?.taste ?? '-'} / 10</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Porcja {d.ratings?.portion ?? '-'} / 5</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Obsługa {d.ratings?.service ?? '-'} / 5</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Atmosfera {d.ratings?.ambience ?? '-'} / 5</span>
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">Kolejka {d.ratings?.queue ?? 0} min</span>
                  </div>

                  {/* miniatury zdjęć */}
                  {d.photos && d.photos.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {d.photos.map((u, i) => (
                        <button
                          key={i}
                          onClick={() => setViewer({ open: true, list: d.photos!, index: i })}
                          className="shrink-0"
                          aria-label="Powiększ zdjęcie"
                        >
                          <img src={u} className="h-16 w-16 rounded-lg object-cover border border-emerald-100" alt="" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* notatki / edycja */}
                  {editingId === d.id ? (
                    <div className="mt-3">
                      <textarea
                        className="w-full border rounded-xl px-3 py-2 border-emerald-200"
                        rows={3}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={saveNotes} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Zapisz</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded border text-sm">Anuluj</button>
                      </div>
                    </div>
                  ) : (
                    d.notes && <div className="mt-2 text-sm text-emerald-900 whitespace-pre-wrap">{d.notes}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* LIGHTBOX */}
      {viewer.open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewer(v => ({ ...v, open: false }))}
        >
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewer.list[viewer.index]}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
              alt=""
            />
            <button
              onClick={() => setViewer(v => ({ ...v, open: false }))}
              className="absolute -top-3 -right-3 bg-white/90 rounded-full p-2 shadow"
              aria-label="Zamknij"
            >
              ✕
            </button>
            {viewer.list.length > 1 && (
              <>
                <button
                  onClick={() => setViewer(v => ({ ...v, index: (v.index - 1 + v.list.length) % v.list.length }))}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
                  aria-label="Poprzednie"
                >
                  ‹
                </button>
                <button
                  onClick={() => setViewer(v => ({ ...v, index: (v.index + 1) % v.list.length }))}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
                  aria-label="Następne"
                >
                  ›
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-sm">
                  {viewer.index + 1} / {viewer.list.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
