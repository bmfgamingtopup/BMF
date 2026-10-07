'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

type Feedback = { error: boolean; text: string };

export default function AdminSettingsPage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'email' | 'password' | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<Feedback | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    const loadAccount = async () => {
      const client = createSupabaseClient();
      if (!client) {
        setEmailFeedback({ error: true, text: 'Supabase n’est pas configuré.' });
        setLoading(false);
        return;
      }

      const { data, error } = await client.auth.getUser();
      if (error || !data.user?.email) {
        setEmailFeedback({ error: true, text: error?.message ?? 'Adresse e-mail introuvable.' });
      } else {
        setCurrentEmail(data.user.email);
        setNewEmail(data.user.email);
      }
      setLoading(false);
    };

    void loadAccount();
  }, []);

  const handleEmailUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving('email');
    setEmailFeedback(null);

    try {
      const client = createSupabaseClient();
      if (!client) throw new Error('Supabase n’est pas configuré.');

      const { error: reauthenticationError } = await client.auth.signInWithPassword({
        email: currentEmail,
        password: emailPassword,
      });
      if (reauthenticationError) throw reauthenticationError;

      const { error } = await client.auth.updateUser(
        { email: newEmail.trim() },
        { emailRedirectTo: `${window.location.origin}/admin/settings` },
      );
      if (error) throw error;

      setEmailPassword('');
      setEmailFeedback({
        error: false,
        text: 'Demande envoyée. Confirme le changement avec le lien reçu par e-mail.',
      });
    } catch (error) {
      setEmailFeedback({ error: true, text: error instanceof Error ? error.message : 'Modification impossible.' });
    } finally {
      setSaving(null);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving('password');
    setPasswordFeedback(null);

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ error: true, text: 'Les nouveaux mots de passe ne correspondent pas.' });
      setSaving(null);
      return;
    }

    try {
      const client = createSupabaseClient();
      if (!client) throw new Error('Supabase n’est pas configuré.');

      const { error: reauthenticationError } = await client.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword,
      });
      if (reauthenticationError) throw reauthenticationError;

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ error: false, text: 'Mot de passe modifié.' });
    } catch (error) {
      setPasswordFeedback({ error: true, text: error instanceof Error ? error.message : 'Modification impossible.' });
    } finally {
      setSaving(null);
    }
  };

  const feedbackClass = (feedback: Feedback) => feedback.error
    ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200';

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-white/10 pb-5">
          <p className="text-xs font-semibold uppercase text-cyan-300">Administration</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Sécurité du compte</h1>
          <p className="mt-2 text-sm text-slate-400">Modifie l’adresse e-mail et le mot de passe de ton compte administrateur.</p>
        </header>

        {loading ? <p className="py-8 text-center text-slate-400">Chargement du compte…</p> : (
          <div className="grid gap-6">
            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Adresse e-mail</h2>
              <p className="mt-1 text-sm text-slate-400">Un lien de confirmation sera envoyé pour valider la nouvelle adresse.</p>
              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handleEmailUpdate(event)}>
                <label className="text-sm text-slate-300 sm:col-span-2">Adresse actuelle
                  <input type="email" value={currentEmail} readOnly className="field opacity-70" />
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">Nouvelle adresse
                  <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" required className="field" />
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">Mot de passe actuel
                  <input type="password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} autoComplete="current-password" required className="field" />
                </label>
                {emailFeedback && <p role="status" className={`rounded-md border px-3 py-2 text-sm sm:col-span-2 ${feedbackClass(emailFeedback)}`}>{emailFeedback.text}</p>}
                <button type="submit" disabled={saving !== null || !currentEmail} className="primary-btn w-full disabled:opacity-50 sm:col-span-2">
                  {saving === 'email' ? 'Enregistrement…' : 'Modifier l’adresse e-mail'}
                </button>
              </form>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Mot de passe</h2>
              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void handlePasswordUpdate(event)}>
                <label className="text-sm text-slate-300 sm:col-span-2">Mot de passe actuel
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required className="field" />
                </label>
                <label className="text-sm text-slate-300">Nouveau mot de passe
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="field" />
                </label>
                <label className="text-sm text-slate-300">Confirmer le mot de passe
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="field" />
                </label>
                {passwordFeedback && <p role="status" className={`rounded-md border px-3 py-2 text-sm sm:col-span-2 ${feedbackClass(passwordFeedback)}`}>{passwordFeedback.text}</p>}
                <button type="submit" disabled={saving !== null || !currentEmail} className="primary-btn w-full disabled:opacity-50 sm:col-span-2">
                  {saving === 'password' ? 'Enregistrement…' : 'Modifier le mot de passe'}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}