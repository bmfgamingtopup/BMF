'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthFrame from '../auth-frame';
import { createSupabaseClient, getAccessToken, requestPasswordReset, signInWithEmail, updatePassword } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('joueur@bmf.gg');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const client = createSupabaseClient();
    if (!client) return;

    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    if (recovery) {
      const { error } = await updatePassword(password);
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Password updated. You can now sign in.');
        setPassword('');
        setRecovery(false);
        window.history.replaceState({}, '', '/login');
      }
      setLoading(false);
      return;
    }

    const { error } = await signInWithEmail(email, password);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Connexion réussie. Vous pouvez accéder à votre espace client.');
      const accessToken = await getAccessToken();
      if (accessToken) {
        const response = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          router.replace(data.role === 'admin' ? '/admin' : '/topup');
          router.refresh();
        }
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage('Enter your email address first.');
      return;
    }

    setLoading(true);
    const { error } = await requestPasswordReset(email);
    setMessage(error ? error.message : 'Password reset instructions have been sent to your email.');
    setLoading(false);
  };

  return (
    <AuthFrame>
      <div className="mb-7 text-center">
        <h1 className="text-[28px] font-semibold text-white">{recovery ? 'Reset password' : 'Welcome 👋'}</h1>
        <p className="mt-3 text-xs text-slate-300">
          {recovery ? 'Choose a new password for your account.' : 'Please enter your email and password'}
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="login-email">Email</label>
        <div className="flex h-11 items-center rounded-md bg-[#2c2f37] px-3 focus-within:ring-1 focus-within:ring-orange-500">
          <span aria-hidden="true" className="mr-3 text-xs text-slate-400">@</span>
          <input id="login-email" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400" required />
        </div>

        <label className="sr-only" htmlFor="login-password">{recovery ? 'New password' : 'Password'}</label>
        <div className="flex h-11 items-center rounded-md bg-[#2c2f37] px-3 focus-within:ring-1 focus-within:ring-orange-500">
          <span aria-hidden="true" className="mr-3 text-xs text-slate-400">▣</span>
          <input id="login-password" type="password" autoComplete={recovery ? 'new-password' : 'current-password'} placeholder={recovery ? 'New password' : 'Password'} value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-400" required minLength={recovery ? 8 : undefined} />
        </div>

        {!recovery && <div className="flex justify-end pt-1">
          <button type="button" onClick={() => void handleForgotPassword()} disabled={loading} className="text-xs text-slate-400 underline decoration-slate-500 underline-offset-2 transition hover:text-white disabled:opacity-50">Forgot password?</button>
        </div>}

        {message && <div role="status" className={`rounded-md border px-3 py-2 text-xs ${message.includes('sent') || message.includes('updated') || message.includes('réussie') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>{message}</div>}

        <button type="submit" disabled={loading} className="h-11 w-full rounded-md bg-[#e45b00] text-xs font-semibold text-white transition hover:bg-[#f06a0b] disabled:opacity-60">
          {loading ? 'Please wait…' : recovery ? 'Update password' : 'Login'}
        </button>
      </form>

      <p className="mt-7 text-center text-xs text-slate-300">
        Don’t have an account?{' '}
        <Link href="/register" className="font-semibold text-orange-500 underline decoration-orange-500/60 underline-offset-2 hover:text-orange-300">Register now!</Link>
      </p>
    </AuthFrame>
  );
}
