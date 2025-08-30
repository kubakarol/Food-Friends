import { db } from './firebase.client';
import {
  addDoc, collection, serverTimestamp, getDocs, query, where,
  doc, getDoc
} from 'firebase/firestore';

export type Place = {
  id?: string;
  name: string;
  city: string;
  mapsUrl?: string | null;
  createdAt?: any;
  createdBy: string;
  visitedBy?: Record<string, boolean>;
};

const placesCol = () => collection(db, 'places');

export async function addPlace(p: Place) {
  const ref = await addDoc(placesCol(), {
    name: p.name.trim(),
    city: p.city.trim(),
    mapsUrl: p.mapsUrl || null,
    createdAt: serverTimestamp(),
    createdBy: p.createdBy,
    visitedBy: { [p.createdBy]: true }
  });
  return ref.id;
}

export async function listPlacesByCity(city: string) {
  const q = query(placesCol(), where('city', '==', city));
  const snap = await getDocs(q);
  // sort lokalnie po nazwie, bez indeksu
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Place))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPlace(id: string) {
  const snap = await getDoc(doc(db, 'places', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Place) : null;
}
