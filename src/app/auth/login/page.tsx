'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase.client';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(false); const [error, setError] = useState('');

  useEffect(() => onAuthStateChanged(auth, (u) => { if (u) router.replace('/feed'); }), [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isNew) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      router.push('/feed');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Food Friends</h1>
        <p className="text-sm text-zinc-500 mb-4">Zaloguj się lub załóż konto</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email" className="border rounded-xl px-3 py-2"
            placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password" className="border rounded-xl px-3 py-2"
            placeholder="Hasło" value={password} onChange={e=>setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button className="rounded-xl bg-black text-white py-2 font-medium">{
            isNew ? 'Zarejestruj' : 'Zaloguj'
          }</button>
        </form>

        <button onClick={()=>setIsNew(!isNew)} className="mt-3 text-sm text-blue-600 underline">
          {isNew ? 'Masz konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
        </button>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
