'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthFrame from '../auth-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createSupabaseClient, getAccessToken, requestPasswordReset, signInWithEmail, updatePassword } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
          router.replace(data.role === 'admin' ? '/admin' : '/player');
          router.refresh();
        } else {
          setMessage('Profil utilisateur introuvable. Contactez le support.');
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
    <AuthFrame variant="login">
      <Card className="w-full max-w-[460px] rounded-[28px] border-[#eee6e3] bg-white/95 p-6 shadow-[0_24px_60px_rgba(54,35,29,0.12)] sm:p-8">
        <div className="mb-7 text-center">
          <h1 className="text-[32px] font-semibold tracking-tight text-[#d83b34]">{recovery ? 'Nouveau mot de passe' : 'Connexion'}</h1>
          <p className="mt-2 text-sm text-[#786b67]">
            {recovery ? 'Choisissez un nouveau mot de passe.' : 'Connectez-vous à votre compte BMF.'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-[#51433f]">Adresse e-mail</label>
            <div className="flex h-13 items-center rounded-xl border border-[#e8dfdc] bg-white px-3 focus-within:border-[#e64d42] focus-within:ring-2 focus-within:ring-[#ea4037]/15">
              <span aria-hidden="true" className="mr-3 text-[#88756e]">@</span>
              <Input id="login-email" type="email" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" required />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-[#51433f]">{recovery ? 'Nouveau mot de passe' : 'Mot de passe'}</label>
            <div className="flex h-13 items-center rounded-xl border border-[#e8dfdc] bg-white px-3 focus-within:border-[#e64d42] focus-within:ring-2 focus-within:ring-[#ea4037]/15">
              <span aria-hidden="true" className="mr-3 text-[#88756e]">▣</span>
              <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete={recovery ? 'new-password' : 'current-password'} placeholder="Votre mot de passe" value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" required minLength={recovery ? 8 : undefined} />
              <button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5d4d49] transition hover:bg-[#f5eeec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e64d42]" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!recovery && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#6c5a54]">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-[#ea4037]" />
                Rester connecté
              </label>
              <button type="button" onClick={() => void handleForgotPassword()} disabled={loading} className="text-sm font-medium text-[#d83b34] underline decoration-[#dca39d] underline-offset-2 transition hover:text-[#a92b26] disabled:opacity-60">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {message && (
            <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${message.includes('sent') || message.includes('updated') || message.includes('réussie') ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <Button type="submit" disabled={loading} size="lg" className="w-full rounded-xl bg-[#e43b34] text-sm font-bold shadow-[0_10px_22px_rgba(228,59,52,0.22)] hover:bg-[#cf302a]">
            {loading ? 'Veuillez patienter…' : recovery ? 'Mettre à jour le mot de passe' : 'Se connecter'}
            <span aria-hidden="true" className="ml-2 text-lg">→</span>
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#786b67]">
          Vous n’avez pas de compte ?{' '}
          <Link href="/register" className="font-semibold text-[#d83b34] underline decoration-[#dca39d] underline-offset-2 hover:text-[#a92b26]">Inscrivez-vous</Link>
        </p>
      </Card>
    </AuthFrame>
  );
}
