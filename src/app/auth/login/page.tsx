'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase.client';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ensureUser } from '@/lib/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(false); const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => { if (u) router.replace('/feed'); }), [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isNew) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await ensureUser(cred.user.uid, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/feed');
    } catch (err: any) { setError(err.message); }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 bg-emerald-50/40">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-900">Food Friends</h1>
        <p className="text-sm text-emerald-600 mb-4">{isNew ? 'Załóż konto' : 'Zaloguj się'}</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" className="border rounded-xl px-3 py-2 border-emerald-200" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input type="password" className="border rounded-xl px-3 py-2 border-emerald-200" placeholder="Hasło" value={password} onChange={e=>setPassword(e.target.value)} />

          {isNew && (
            <>
              <input className="border rounded-xl px-3 py-2 border-emerald-200" placeholder="Nazwa wyświetlana"
                     value={displayName} onChange={e=>setDisplayName(e.target.value)} />

            </>
          )}

          <button className="rounded-xl bg-emerald-600 text-white py-2 font-medium hover:bg-emerald-700 transition">
            {isNew ? 'Zarejestruj' : 'Zaloguj'}
          </button>
        </form>

        <button onClick={()=>setIsNew(!isNew)} className="mt-3 text-sm text-sky-700 underline">
          {isNew ? 'Masz konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
        </button>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
