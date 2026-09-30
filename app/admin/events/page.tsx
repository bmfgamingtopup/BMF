'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import type { AiEvent } from '@/lib/data';

type EventRow = AiEvent & { id: string };

const statusClass: Record<string, string> = {
  draft: 'bg-violet-500/10 text-violet-200',
  review: 'bg-amber-500/10 text-amber-200',
  published: 'bg-emerald-500/10 text-emerald-200',
  rejected: 'bg-rose-500/10 text-rose-200',
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/events', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? 'Impossible de charger les événements.');
      } else {
        setEvents(data.events ?? []);
        setErrorMessage(null);
      }
    } catch {
      setErrorMessage('Connexion au serveur impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // The request awaits auth and the API before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, []);

  const handleDecision = async (id: string, nextStatus: 'published' | 'rejected') => {
    setSavingEventId(id);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ eventId: id, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? 'La décision n’a pas pu être enregistrée.');
      } else {
        await loadEvents();
      }
    } catch {
      setErrorMessage('Connexion au serveur impossible. Réessayez.');
    } finally {
      setSavingEventId(null);
    }
  };

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setGenerating(true);
    setErrorMessage(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: new FormData(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'La génération a échoué.');
      setEvents((current) => [data.event, ...current]);
      form.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'La génération a échoué.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Retour à l’accueil" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-xl text-slate-200 transition hover:border-violet-400 hover:text-white">
              ←
            </Link>
            <Link href="/" className="flex items-center gap-3 text-xl font-black tracking-[0.18em] text-violet-300">
              BMF AI Hub
            </Link>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin" className="text-cyan-200 hover:text-white">Dashboard</Link>
            <Link href="/admin/payments" className="text-cyan-200 hover:text-white">QR marchands</Link>
            <Link href="/admin/orders" className="text-violet-200 hover:text-violet-100">Validation paiements</Link>
          </nav>
        </header>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Modération IA</p>
          <h1 className="mt-3 text-4xl font-black text-white">Actualités Gaming</h1>
        </div>

        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>}

        <form onSubmit={(event) => void handleGenerate(event)} className="mb-8 border-y border-white/10 py-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">Préparer un article</h2>
            <p className="mt-1 text-sm text-slate-400">Ajoute des informations ou une image, donne tes consignes à l’IA, puis relis le brouillon avant publication.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="block text-sm text-slate-300">Consignes pour l’IA
              <textarea name="instructions" required maxLength={3000} rows={4} className="field resize-y" placeholder="Ex. Présente cette nouveauté avec un ton enthousiaste, en précisant les dates et les conditions…" />
            </label>
            <label className="block text-sm text-slate-300">Informations à inclure
              <textarea name="sourceText" maxLength={12000} rows={4} className="field resize-y" placeholder="Détails, dates, prix, lien ou contexte utile… (facultatif si une image est fournie)" />
            </label>
            <label className="block text-sm text-slate-300 lg:col-span-2">Image de référence (JPG, PNG ou WebP, 4 Mo maximum)
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field" />
            </label>
          </div>
          <button type="submit" disabled={generating} className="primary-btn mt-5 disabled:opacity-50">
            {generating ? 'Génération du brouillon…' : 'Générer un brouillon'}
          </button>
        </form>

        {loading ? (
          <div className="card p-10 text-center text-slate-300">Chargement des événements réels…</div>
        ) : events.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {events.map((event) => (
              <article key={event.title} className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className={`status-pill ${statusClass[event.status] ?? 'bg-slate-500/10 text-slate-300'}`}>
                    {event.status}
                  </span>
                  <span className="text-xs text-slate-400">{event.date}</span>
                </div>

                {event.image_url && <Image src={event.image_url} alt={event.title} width={1200} height={675} unoptimized className="mb-4 aspect-video w-full rounded-md object-cover" />}
                <h2 className="text-2xl font-bold text-white">{event.title}</h2>
                <p className="mt-4 text-sm leading-6 text-slate-300">{event.summary}</p>
                {event.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {event.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">{tag}</span>)}
                  </div>
                )}
                {event.content && (
                  <details className="mt-4 border-t border-white/10 pt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-200">Lire l’article complet</summary>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{event.content}</p>
                  </details>
                )}
                {event.reward && event.reward !== '0' && event.reward !== '0 HTG' && (
                  <div className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm text-cyan-200">Récompense: {event.reward}</div>
                )}

                {event.status === 'draft' || event.status === 'review' ? (
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      disabled={savingEventId === event.id}
                      onClick={() => void handleDecision(event.id, 'published')}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950"
                    >
                      Publier
                    </button>
                    <button
                      type="button"
                      disabled={savingEventId === event.id}
                      onClick={() => void handleDecision(event.id, 'rejected')}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Refuser
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {event.status === 'published' ? 'Publié' : 'Refusé'}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center text-slate-300">
            Aucun article généré pour le moment. La file d’attente IA s’active dès que le moteur de contenu est connecté.
          </div>
        )}
      </div>
    </main>
  );
}
