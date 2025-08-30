'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { auth } from '@/lib/firebase.client';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  ensureUser, UserDoc,
  listIncomingRequests, acceptFriendRequest, rejectFriendRequest,
  getUser, sendFriendRequest, listFriends
} from '@/lib/firestore';
import { Check, X, Copy, Send, LogOut } from 'lucide-react';

type Incoming = Awaited<ReturnType<typeof listIncomingRequests>>[number] & {
  fromUser?: (UserDoc & { uid: string }) | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [me, setMe] = useState<any>(null);
  const [meDoc, setMeDoc] = useState<UserDoc | null>(null);

  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);

  const [friends, setFriends] = useState<Array<{ uid: string } & UserDoc>>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [codeInput, setCodeInput] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (!u) return;
        setMe(u);

        const doc = await ensureUser(u.uid);
        setMeDoc(doc);

        // zaproszenia
        setLoadingIncoming(true);
        const reqs = await listIncomingRequests(u.uid);
        const withUsers: Incoming[] = [];
        for (const r of reqs) {
          const fu = await getUser(r.fromUid);
          withUsers.push({ ...r, fromUser: fu ? { uid: r.fromUid, ...fu } : null });
        }
        setIncoming(withUsers);
        setLoadingIncoming(false);

        // znajomi
        setLoadingFriends(true);
        setFriends(await listFriends(u.uid));
        setLoadingFriends(false);
      }),
    []
  );

  const friendCode = meDoc?.friendCode ?? '';
  const initial = (meDoc?.displayName || 'U')[0]?.toUpperCase?.() || 'U';
  const maskedUid = (uid: string) => `${uid.slice(0, 6)}…${uid.slice(-4)}`;

  async function copyCode() {
    if (!friendCode) return;
    await navigator.clipboard.writeText(friendCode);
    setMsg('Skopiowano kod!');
    setTimeout(() => setMsg(''), 1800);
  }

  async function accept(id: string, otherUid: string) {
    if (!me) return;
    setBusyId(id);
    await acceptFriendRequest(id, me.uid, otherUid);
    setIncoming((list) => list.filter((r) => r.id !== id));
    setFriends(await listFriends(me.uid));
    setBusyId(null);
  }

  async function reject(id: string) {
    setBusyId(id);
    await rejectFriendRequest(id);
    setIncoming((list) => list.filter((r) => r.id !== id));
    setBusyId(null);
  }

  async function send() {
    setMsg('');
    try {
      const trimmed = codeInput.trim().toUpperCase();
      if (!trimmed) return;
      await sendFriendRequest(me.uid, trimmed);
      setCodeInput('');
      setMsg('Zaproszenie wysłane ✅');
    } catch (e: any) {
      setMsg(e.message || 'Błąd wysyłania');
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      // ew. czyścimy lokalne preferencje
      localStorage.removeItem('ff.city');
      router.replace('/auth/login');
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <AppShell
      title="Profil"
      right={
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1 text-emerald-700 bg-white hover:bg-emerald-50"
          title="Wyloguj"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm">Wyloguj</span>
        </button>
      }
    >
      {/* Nagłówek profilu z avatarem */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
          <span className="font-semibold">{initial}</span>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-emerald-900">{meDoc?.displayName || 'Użytkownik'}</div>
          <div className="text-emerald-600 text-sm">
            Kod: <b>{friendCode || '—'}</b>
          </div>
        </div>
        <button
          onClick={copyCode}
          className="rounded-full border border-emerald-200 px-3 py-1 text-emerald-700 bg-white hover:bg-emerald-50 disabled:opacity-60"
          disabled={!friendCode}
          title="Skopiuj mój kod"
        >
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span className="text-sm">Kopiuj</span>
          </div>
        </button>
      </div>
      {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}

      {/* Zaproszenia – avatar, nazwa, Akceptuj / Odrzuć */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm mb-4">
        <div className="font-semibold mb-3">Zaproszenia</div>

        {loadingIncoming ? (
          <p className="text-emerald-700 text-sm">Ładowanie…</p>
        ) : incoming.length === 0 ? (
          <p className="text-emerald-700 text-sm">Brak zaproszeń.</p>
        ) : (
            <ul className="space-y-2">
            {incoming.map((r) => {
                const name = r.fromUser?.displayName || maskedUid(r.fromUid);
                const letter = (r.fromUser?.displayName || 'U')[0]?.toUpperCase?.() || 'U';

                return (
                <li
                    key={r.id}
                    className="
                    rounded-xl border border-emerald-100 bg-emerald-50/30 p-3
                    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
                    "
                >
                    {/* avatar + nazwa */}
                    <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                    <div className="h-9 w-9 rounded-full bg-emerald-200 text-emerald-900
                                    flex items-center justify-center text-sm font-semibold">
                        {letter}
                    </div>

                    {/* usuń truncate; pozwól zawijać tekst */}
                    <div className="font-medium text-emerald-900 break-words">
                        {name}
                    </div>
                    </div>

                    {/* akcje – pod nazwą na mobile; w wierszu na szerszych */}
                    <div className="flex gap-2 sm:self-auto self-stretch">
                    <button
                        onClick={() => accept(r.id!, r.fromUid)}
                        disabled={busyId === r.id}
                        className="
                        inline-flex items-center justify-center gap-1
                        rounded-full bg-emerald-600 text-white
                        px-3 py-1.5 text-sm hover:bg-emerald-700 disabled:opacity-60
                        flex-1 sm:flex-none
                        "
                        title="Akceptuj"
                    >
                        <Check className="h-4 w-4" /> Akceptuj
                    </button>

                    <button
                        onClick={() => reject(r.id!)}
                        disabled={busyId === r.id}
                        className="
                        inline-flex items-center justify-center gap-1
                        rounded-full border px-3 py-1.5 text-sm hover:bg-emerald-50 disabled:opacity-60
                        flex-1 sm:flex-none
                        "
                        title="Odrzuć"
                    >
                        <X className="h-4 w-4" /> Odrzuć
                    </button>
                    </div>
                </li>
                );
            })}
            </ul>
        )}
      </div>

      {/* Znajomi + wysyłanie zaproszeń */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm mb-4">
        <div className="font-semibold mb-2">Znajomi</div>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border rounded-xl px-3 py-2 border-emerald-200"
            placeholder="Kod znajomego"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button
            onClick={send}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" /> Wyślij
          </button>
        </div>

        {loadingFriends ? (
          <p className="text-emerald-700 text-sm">Ładowanie znajomych…</p>
        ) : friends.length === 0 ? (
          <p className="text-emerald-700 text-sm">Brak znajomych.</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.uid}
                className="rounded-xl border border-emerald-100 p-3 flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-semibold">
                  {(f.displayName || 'U')[0].toUpperCase()}
                </div>
                <div className="text-sm">{f.displayName || maskedUid(f.uid)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
