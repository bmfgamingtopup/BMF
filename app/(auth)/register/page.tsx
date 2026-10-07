'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthFrame from '../auth-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signUpWithEmail } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
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

    const { data, error } = await signUpWithEmail(email, password, {
      first_name: firstName,
      last_name: lastName,
    });

    if (error) {
      setMessage(error.message);
    } else if (data?.session) {
      router.replace('/player');
      router.refresh();
    } else {
      setMessage('Compte créé. Vérifie ton email pour finaliser l’inscription.');
    }

    setLoading(false);
  };

  return (
    <AuthFrame variant="register">
      <Card className="w-full max-w-[460px] rounded-[28px] border-[#eee6e3] bg-white/95 p-6 shadow-[0_24px_60px_rgba(54,35,29,0.12)] sm:p-8">
        <div className="mb-7 text-center">
          <h1 className="text-[32px] font-semibold tracking-tight text-[#d83b34]">Créer un compte</h1>
          <p className="mt-2 text-sm text-[#786b67]">Rejoignez BMF avec votre adresse e-mail.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <label className="sr-only" htmlFor="register-first-name">Prénom</label>
          <Input id="register-first-name" type="text" autoComplete="given-name" placeholder="Prénom" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-12 min-w-0 text-sm focus-visible:ring-[#ea4037]/15" required />
          <label className="sr-only" htmlFor="register-last-name">Nom</label>
          <Input id="register-last-name" type="text" autoComplete="family-name" placeholder="Nom" value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-12 min-w-0 text-sm focus-visible:ring-[#ea4037]/15" required />
        </div>

        <label className="sr-only" htmlFor="register-email">Adresse e-mail</label>
        <div className="flex h-12 items-center rounded-xl border border-[#e8dfdc] bg-white px-3 focus-within:border-[#e64d42] focus-within:ring-2 focus-within:ring-[#ea4037]/15">
          <span aria-hidden="true" className="mr-3 text-[#88756e]">@</span>
          <Input id="register-email" type="email" autoComplete="email" placeholder="Adresse e-mail" value={email} onChange={(event) => setEmail(event.target.value)} className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" required />
        </div>

        <label className="sr-only" htmlFor="register-password">Mot de passe</label>
        <div className="flex h-12 items-center rounded-xl border border-[#e8dfdc] bg-white px-3 focus-within:border-[#e64d42] focus-within:ring-2 focus-within:ring-[#ea4037]/15">
          <span aria-hidden="true" className="mr-3 text-[#88756e]">▣</span>
          <Input id="register-password" type="password" autoComplete="new-password" placeholder="Mot de passe (8 caractères minimum)" value={password} onChange={(event) => setPassword(event.target.value)} className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0" required minLength={8} />
        </div>

        {message && <div role="status" className={`rounded-lg border px-3 py-2 text-sm ${message.includes('créé') || message.includes('Vérifie') ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</div>}

        <Button type="submit" disabled={loading} size="lg" className="w-full rounded-xl bg-[#e43b34] text-sm font-bold shadow-[0_10px_22px_rgba(228,59,52,0.22)] hover:bg-[#cf302a]">
          {loading ? 'Création du compte…' : 'Créer mon compte'}
        </Button>
      </form>

        <p className="mt-6 text-center text-sm text-[#786b67]">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-[#d83b34] underline decoration-[#dca39d] underline-offset-2 hover:text-[#a92b26]">Connectez-vous</Link>
        </p>
      </Card>
    </AuthFrame>
  );
}
