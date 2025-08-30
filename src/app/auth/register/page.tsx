'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase.client';
import { ensureUser } from '@/lib/firestore';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!displayName.trim()) {
      setErr('Podaj nazwę wyświetlaną.'); return;
    }
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      // utwórz dokument usera z nazwą wyświetlaną
      await ensureUser(cred.user.uid, { displayName: displayName.trim() });
      router.replace('/feed');
    } catch (e: any) {
      setErr(e.message || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Food Friends</h1>
      <p className="mb-4">Utwórz konto</p>

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <input
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          placeholder="Nazwa wyświetlana"
          value={displayName}
          onChange={e=>setDisplayName(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          placeholder="E-mail"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border rounded-xl px-3 py-2 border-emerald-200"
          placeholder="Hasło"
          type="password"
          value={pass}
          onChange={e=>setPass(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button disabled={loading} className="w-full rounded-xl bg-emerald-600 text-white py-3 font-semibold disabled:opacity-60">
          Zarejestruj
        </button>
      </form>

      <button
        onClick={()=>router.push('/auth/login')}
        className="mt-3 text-emerald-700 underline"
      >
        Masz konto? Zaloguj się
      </button>
    </div>
  );
}
