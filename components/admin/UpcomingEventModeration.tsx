'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type UpcomingEvent = {
  id: string;
  title: string;
  category: string;
  diamond_cost: string;
  start_date: string;
  description_fr: string;
  description_ht: string;
  image_url: string;
  is_active: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
};

export default function UpcomingEventModeration() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/upcoming-events', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Impossible de charger les événements à venir.');
      } else {
        setEvents(data.events ?? []);
        setError(null);
      }
    } catch {
      setError('Connexion au serveur impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for authentication and the API request before updating component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
  }, []);

  const moderateEvent = async (eventId: string, moderationStatus: 'approved' | 'rejected') => {
    setSavingId(eventId);
    setError(null);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/upcoming-events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ eventId, moderationStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'La décision n’a pas pu être enregistrée.');
      } else {
        await loadEvents();
      }
    } catch {
      setError('Connexion au serveur impossible. Réessayez.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="mt-12 border-t border-white/10 pt-8">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Make.com · validation requise</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Événements à venir Free Fire</h2>
        <p className="mt-2 text-sm text-slate-400">Les événements restent cachés aux joueurs jusqu’à leur approbation.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {loading ? (
        <p className="card p-6 text-sm text-slate-300">Chargement des événements reçus…</p>
      ) : events.length === 0 ? (
        <p className="card p-6 text-sm text-slate-400">Aucun événement reçu de Make.com pour le moment.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="card overflow-hidden">
              <Image src={event.image_url} alt="" width={1200} height={600} unoptimized className="aspect-[16/7] w-full object-cover" />
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${event.moderation_status === 'pending' ? 'bg-amber-400/10 text-amber-200' : event.moderation_status === 'approved' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'}`}>
                    {event.moderation_status === 'pending' ? 'En attente' : event.moderation_status === 'approved' ? 'Approuvé' : 'Refusé'}
                  </span>
                  <time className="text-xs text-slate-400" dateTime={event.start_date}>{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.start_date}T00:00:00Z`))}</time>
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-violet-200">{event.category} · 💎 {event.diamond_cost}</p>
                <h3 className="mt-2 text-xl font-bold text-white">{event.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{event.description_fr}</p>
                <details className="mt-3 text-sm text-slate-400">
                  <summary className="cursor-pointer">Voir la description en créole</summary>
                  <p className="mt-2 leading-6">{event.description_ht}</p>
                </details>
                {event.moderation_status === 'pending' && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" disabled={savingId === event.id} onClick={() => void moderateEvent(event.id, 'approved')} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">
                      {savingId === event.id ? 'Enregistrement…' : 'Approuver et publier'}
                    </button>
                    <button type="button" disabled={savingId === event.id} onClick={() => void moderateEvent(event.id, 'rejected')} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-50">
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
