'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { auth, storage } from '@/lib/firebase.client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  ensureUser, getUser, listFriends, UserDoc,
  listIncomingRequests, acceptFriendRequest, rejectFriendRequest,
  sendFriendRequest
} from '@/lib/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [doc, setDoc] = useState<UserDoc | null>(null);
  const [friends, setFriends] = useState<Array<{uid:string} & UserDoc>>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [addCode, setAddCode] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() =>
    onAuthStateChanged(auth, async (u)=>{
      if (!u) return;
      setUser(u);
      const d = await ensureUser(u.uid);
      setDoc(d);
      setFriends(await listFriends(u.uid));
      setIncoming(await listIncomingRequests(u.uid));
    }), []
  );

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const r = ref(storage, `avatars/${user.uid}.jpg`);
    await uploadBytes(r, file);
    const url = await getDownloadURL(r);
    const d = await ensureUser(user.uid, { photoURL: url });
    setDoc(d);
  }

  async function logout() {
    try {
      await signOut(auth);
      location.href = '/auth/login';
    } catch (e) {}
  }

  async function sendReq() {
    if (!user || !addCode.trim()) return;
    try {
      await sendFriendRequest(user.uid, addCode.trim());
      setAddCode(''); setMsg('Wysłano zaproszenie!');
    } catch (e:any) { setMsg(e.message || 'Błąd'); }
    finally { setTimeout(()=>setMsg(''), 2500); }
  }

  async function accept(req: any) {
    await acceptFriendRequest(req.id, req.toUid, req.fromUid);
    setFriends(await listFriends(user.uid));
    setIncoming(await listIncomingRequests(user.uid));
  }
  async function reject(req: any) {
    await rejectFriendRequest(req.id);
    setIncoming(await listIncomingRequests(user.uid));
  }

  return (
    <AppShell title="Profil" right={
      <button onClick={logout} className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-sm">Wyloguj</button>
    }>
      {!user ? <p>Ładowanie…</p> : (
        <div className="space-y-5">
          {/* header */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm flex items-center gap-4">
            <label className="relative w-16 h-16 rounded-full overflow-hidden bg-emerald-100 cursor-pointer">
              {doc?.photoURL ? <img src={doc.photoURL} alt="" className="w-full h-full object-cover" /> : null}
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onPickAvatar} />
            </label>
            <div className="flex-1">
              <div className="text-lg font-semibold text-emerald-900">{doc?.displayName || user.email}</div>
              <div className="text-sm text-emerald-700">Kod: <span className="font-mono">{doc?.friendCode ?? '—'}</span></div>
            </div>
          </div>

          {/* Zaproszenia przychodzące */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Zaproszenia</h2>
            {incoming.length === 0 ? (
              <p className="text-sm text-emerald-700">Brak.</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map(req => (
                  <li key={req.id} className="flex items-center gap-2">
                    <span className="text-sm">Od: {req.fromUid}</span>
                    <button onClick={()=>accept(req)} className="px-2 py-1 text-sm rounded bg-emerald-600 text-white">Akceptuj</button>
                    <button onClick={()=>reject(req)} className="px-2 py-1 text-sm rounded bg-zinc-200">Odrzuć</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Znajomi + wysyłanie zaproszeń */}
          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="font-semibold mb-3">Znajomi</h2>
            <div className="flex gap-2 mb-3">
              <input className="flex-1 border rounded-xl px-3 py-2 border-emerald-200" placeholder="Kod znajomego" value={addCode} onChange={e=>setAddCode(e.target.value)} />
              <button onClick={sendReq} className="rounded-xl bg-sky-600 text-white px-4">Wyślij</button>
            </div>
            {msg && <p className="text-emerald-700 text-sm mb-2">{msg}</p>}

            {friends.length === 0 ? (
              <p className="text-emerald-700">Brak znajomych.</p>
            ) : (
              <ul className="space-y-2">
                {friends.map(f => (
                  <li key={f.uid} className="rounded-xl border border-emerald-100 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-emerald-100">
                      {f.photoURL ? <img src={f.photoURL} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{f.displayName || 'Użytkownik'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
