import { db, storage } from './firebase.client';
import {
  addDoc, collection, serverTimestamp, getDocs, query, where,
  doc, getDoc, setDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const normCity = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** ---------- PLACES ---------- */
export type Place = {
  id?: string;
  name: string;
  city: string;
  normalizedCity?: string;
  mapsUrl?: string | null;
  createdAt?: any;
  createdBy: string;
  visitedBy?: Record<string, boolean>;
};

const placesCol = () => collection(db, 'places');

export async function addPlace(p: Place) {
  const refd = await addDoc(placesCol(), {
    name: p.name.trim(),
    city: p.city.trim(),
    normalizedCity: normCity(p.city),
    mapsUrl: p.mapsUrl || null,
    createdAt: serverTimestamp(),
    createdBy: p.createdBy,
    visitedBy: { [p.createdBy]: true },
  });
  return refd.id;
}

export async function listPlacesInCityByAuthors(city: string, authors: string[]) {
  const nc = normCity(city);
  const chunks: string[][] = [];
  for (let i = 0; i < authors.length; i += 10) chunks.push(authors.slice(i, i + 10));

  const res: Place[] = [];
  for (const ch of chunks) {
    const qy = query(placesCol(), where('normalizedCity', '==', nc), where('createdBy', 'in', ch));
    const snap = await getDocs(qy);
    snap.docs.forEach(d => res.push({ id: d.id, ...d.data() } as Place));
  }

  if (res.length === 0) {
    const all = await getDocs(placesCol());
    all.docs.forEach(d => {
      const raw = (d.data() as any);
      const n = normCity(raw.city || '');
      if (n === nc && authors.includes(raw.createdBy)) {
        res.push({ id: d.id, ...(raw as any) } as Place);
      }
    });
  }

  res.sort((a, b) => a.name.localeCompare(b.name));
  return res;
}

export async function listAllCities() {
  const snap = await getDocs(placesCol());
  const map = new Map<string, string>();
  snap.docs.forEach(d => {
    const raw = (d.data() as any).city as string;
    const n = normCity(raw);
    if (!map.has(n)) map.set(n, raw);
  });
  return Array.from(map.values()).sort();
}

export async function getPlace(id: string) {
  const s = await getDoc(doc(db, 'places', id));
  return s.exists() ? ({ id: s.id, ...s.data() } as Place) : null;
}

/** ---------- USERS / FRIENDS ---------- */
export type UserDoc = {
  displayName?: string;
  friendCode?: string;
  friends?: Record<string, boolean>;
  photoURL?: string | null;
};

export async function getUser(uid: string) {
  const r = doc(db, 'users', uid);
  const s = await getDoc(r);
  return s.exists() ? (s.data() as UserDoc) : null;
}

/**
 * Tworzy dokument usera lub:
 *  - gdy overwrite=false (domyślnie): uzupełnia TYLKO brakujące pola
 *  - gdy overwrite=true: nadpisuje przekazane pola
 */
export async function ensureUser(uid: string, patch?: Partial<UserDoc>, overwrite = false) {
  const r = doc(db, 'users', uid);
  const s = await getDoc(r);

  if (!s.exists()) {
    const friendCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    const data: UserDoc = { friendCode, friends: {}, photoURL: null, ...(patch || {}) };
    await setDoc(r, data as any);
    return data;
  }

  const current = s.data() as UserDoc;

  if (patch && Object.keys(patch).length) {
    if (overwrite) {
      await updateDoc(r, patch as any);
      return { ...current, ...patch };
    }

    const toPatch: Partial<UserDoc> = {};
    (Object.keys(patch) as (keyof UserDoc)[]).forEach((k) => {
      const curr = current[k];
      const next = patch[k];
      if (curr == null || curr === '') {
        if (next != null && next !== '') toPatch[k] = next as any;
      }
    });

    if (Object.keys(toPatch).length) {
      await updateDoc(r, toPatch as any);
      return { ...current, ...toPatch };
    }
  }

  return current;
}

// --- ZAPROSZENIA ---
const reqsCol = () => collection(db, 'friendRequests');

export type FriendRequest = {
  id?: string;
  fromUid: string;
  toUid: string;
  fromName?: string;  // snapshot imienia nadawcy
  createdAt?: any;
};

export async function sendFriendRequest(fromUid: string, toCode: string) {
  const usersSnap = await getDocs(collection(db, 'users'));
  let toUid: string | null = null;
  usersSnap.forEach(d => {
    const u = (d.data() as UserDoc);
    if (u.friendCode?.toUpperCase() === toCode.toUpperCase()) toUid = d.id;
  });

  if (!toUid || toUid === fromUid) throw new Error('Nie znaleziono użytkownika z tym kodem.');

  const pend = await getDocs(query(
    reqsCol(),
    where('fromUid', '==', fromUid),
    where('toUid', '==', toUid)
  ));
  if (!pend.empty) throw new Error('Zaproszenie już wysłane.');

  const me = await getUser(fromUid);
  const fromName = me?.displayName || null;

  await addDoc(reqsCol(), { fromUid, toUid, fromName, createdAt: serverTimestamp() });
}

export async function listIncomingRequests(uid: string) {
  const snap = await getDocs(query(reqsCol(), where('toUid', '==', uid)));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as FriendRequest) }));
}

export async function acceptFriendRequest(requestId: string, meUid: string, otherUid: string) {
  const meRef = doc(db, 'users', meUid);
  const otherRef = doc(db, 'users', otherUid);
  await updateDoc(meRef, { [`friends.${otherUid}`]: true } as any);
  await updateDoc(otherRef, { [`friends.${meUid}`]: true } as any);
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

export async function rejectFriendRequest(requestId: string) {
  await deleteDoc(doc(db, 'friendRequests', requestId));
}

export async function listFriends(uid: string) {
  const me = await getUser(uid);
  const ids = Object.keys(me?.friends ?? {});
  if (ids.length === 0) return [];
  const res: Array<{ uid: string } & UserDoc> = [];
  for (const id of ids) {
    const u = await getUser(id);
    if (u) res.push({ uid: id, ...u });
  }
  return res;
}

/** ---------- DISHES ---------- */
export type DishRatings = {
  taste: number;
  portion: number;
  service: number;
  ambience: number;
  queue: number;
  price: number | null;
};

export type Dish = {
  id?: string;
  placeId: string;
  userId: string;
  authorName: string;
  dishName: string;
  dishType: string;
  ratings: DishRatings;
  notes?: string;
  photos?: string[];
  createdAt?: any;
};

const dishesCol = () => collection(db, 'dishes');

export async function addDish(d: Dish) {
  const refd = await addDoc(dishesCol(), {
    ...d,
    dishName: d.dishName.trim(),
    dishType: d.dishType.trim().toLowerCase(),
    createdAt: serverTimestamp(),
  });
  return refd.id;
}

export async function uploadDishPhotos(userId: string, dishId: string, files: (File | Blob)[]) {
  const urls: string[] = [];
  for (const file of files) {
    const r = ref(storage, `dishes/${userId}/${dishId}/${crypto.randomUUID()}`);
    const contentType = (file as any).type || 'image/webp';
    await uploadBytes(r, file, {
      contentType,
      cacheControl: 'public,max-age=31536000,immutable',
    });
    urls.push(await getDownloadURL(r));
  }
  const refd = doc(db, 'dishes', dishId);
  const snap = await getDoc(refd);
  const prev = (snap.exists() && (snap.data() as Dish).photos) || [];
  await updateDoc(refd, { photos: [...prev, ...urls] } as any);
  return urls;
}

export async function listDishesForPlace(placeId: string) {
  const qy = query(dishesCol(), where('placeId', '==', placeId));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Dish));
}

export async function listDishTypesForUser(userId: string) {
  const qy = query(dishesCol(), where('userId', '==', userId));
  const snap = await getDocs(qy);
  const set = new Set<string>();
  snap.docs.forEach(d => set.add(((d.data() as Dish).dishType)));
  return Array.from(set).sort();
}

export async function getDish(id: string) {
  const s = await getDoc(doc(db, 'dishes', id));
  return s.exists() ? ({ id: s.id, ...s.data() } as Dish) : null;
}

export async function updateDish(dishId: string, patch: Partial<Dish>) {
  const refd = doc(db, 'dishes', dishId);
  await updateDoc(refd, patch as any);
}

export async function deleteDish(dishId: string) {
  await deleteDoc(doc(db, 'dishes', dishId));
}

/** Spróbuj skasować plik w Storage podając jego publiczny URL (bez błędu przy niepowodzeniu). */
export async function deleteStorageByUrl(url: string) {
  try {
    const r = ref(storage, url);
    await deleteObject(r);
  } catch (e) {
    console.warn('deleteStorageByUrl failed:', e);
  }
}
