'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Gem, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { createSupabaseClient } from '@/lib/supabase/client';

type UpcomingEvent = {
  id: string;
  title: string;
  category: string;
  diamond_cost: string;
  start_date: string;
  description_fr: string;
  description_ht: string;
  image_url: string;
};

type Language = 'fr' | 'ht';

export default function UpcomingEvents() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [language, setLanguage] = useState<Language>('fr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      const client = createSupabaseClient();
      if (!client) {
        setError('Les événements à venir sont temporairement indisponibles.');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await client
        .from('upcoming_events')
        .select('id, title, category, diamond_cost, start_date, description_fr, description_ht, image_url')
        .eq('is_active', true)
        .eq('moderation_status', 'approved')
        .gte('start_date', new Date().toISOString().slice(0, 10))
        .order('start_date', { ascending: true });

      if (!active) return;
      if (queryError) {
        setError('Impossible de charger les événements à venir.');
      } else {
        setEvents(data ?? []);
        setError(null);
      }
      setLoading(false);
    };

    void loadEvents();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="upcoming-events-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Événements Free Fire</p>
          <h2 id="upcoming-events-title" className="mt-2 text-xl font-bold text-white">À venir</h2>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#101626] p-1" aria-label="Langue des descriptions">
          {(['fr', 'ht'] as const).map((locale) => (
            <button key={locale} type="button" aria-pressed={language === locale} onClick={() => setLanguage(locale)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${language === locale ? 'bg-amber-300 text-slate-950' : 'text-slate-400 hover:text-white'}`}>
              {locale === 'fr' ? 'FR' : 'HT'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rounded-xl border border-white/10 bg-[#111827]/80 p-5 text-sm text-slate-400">Chargement des événements…</p>
      ) : error ? (
        <p role="status" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-5 text-sm text-rose-200">{error}</p>
      ) : events.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-9 text-center">
          <Sparkles className="h-6 w-6 text-amber-200" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-white">De nouveaux événements arrivent</h3>
          <p className="mt-1 text-sm text-slate-400">Les annonces à venir seront affichées ici.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden border-amber-200/15 bg-[#111827]/90 text-slate-100">
              <div className="relative aspect-[16/8] overflow-hidden bg-slate-900">
                <Image src={event.image_url} alt={event.title} fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="object-cover transition duration-500 hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-[#101626]/85 px-3 py-1 text-xs font-semibold text-amber-100 backdrop-blur">
                  {event.category}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    <time dateTime={event.start_date}>{new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'ht-HT', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${event.start_date}T00:00:00Z`))}</time>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                    <Gem className="h-3.5 w-3.5" aria-hidden="true" />
                    {event.diamond_cost}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{event.title}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">{language === 'fr' ? event.description_fr : event.description_ht}</p>
                <Link href="/topup" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-[0_10px_24px_rgba(109,40,217,0.25)] transition hover:brightness-110">
                  Recharger mes diamants maintenant
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
