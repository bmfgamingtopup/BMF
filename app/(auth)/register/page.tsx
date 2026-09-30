'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthFrame from '../auth-frame';
import { signUpWithEmail } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await signUpWithEmail(email, password, {
      first_name: firstName,
      last_name: lastName,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Compte créé. Vérifie ton email pour finaliser l’inscription.');
    }

    setLoading(false);
  };

  return (
    <AuthFrame>
      <div className="mb-6 text-center">
        <h1 className="text-[28px] font-semibold text-white">Create account</h1>
        <p className="mt-3 text-xs text-slate-300">Join BMF with your email and password.</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <label className="sr-only" htmlFor="register-first-name">First name</label>
          <input id="register-first-name" type="text" autoComplete="given-name" placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 min-w-0 rounded-md bg-[#2c2f37] px-3 text-xs text-white outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-orange-500" required />
          <label className="sr-only" htmlFor="register-last-name">Last name</label>
          <input id="register-last-name" type="text" autoComplete="family-name" placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 min-w-0 rounded-md bg-[#2c2f37] px-3 text-xs text-white outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-orange-500" required />
        </div>

        <label className="sr-only" htmlFor="register-email">Email</label>
        <div className="flex h-11 items-center rounded-md bg-[#2c2f37] px-3 focus-within:ring-1 focus-within:ring-orange-500">
          <span aria-hidden="true" className="mr-3 text-xs text-slate-400">@</span>
          <input id="register-email" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400" required />
        </div>

        <label className="sr-only" htmlFor="register-password">Password</label>
        <div className="flex h-11 items-center rounded-md bg-[#2c2f37] px-3 focus-within:ring-1 focus-within:ring-orange-500">
          <span aria-hidden="true" className="mr-3 text-xs text-slate-400">▣</span>
          <input id="register-password" type="password" autoComplete="new-password" placeholder="Password (8 characters minimum)" value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400" required minLength={8} />
        </div>

        {message && <div role="status" className={`rounded-md border px-3 py-2 text-xs ${message.includes('créé') || message.includes('Vérifie') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>{message}</div>}

        <button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#e45b00] text-xs font-semibold text-white transition hover:bg-[#f06a0b] disabled:opacity-60">
          {loading ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-slate-300">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-orange-500 underline decoration-orange-500/60 underline-offset-2 hover:text-orange-300">Login</Link>
      </p>
    </AuthFrame>
  );
}
