'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';
import { formatHtgAmount } from '@/lib/currency';

type DashboardStats = {
  visitsToday: number;
  visitsMonth: number;
  uniqueVisitorsToday: number;
  onlineNow: number;
  registeredUsers: number;
  paidOrders: number;
  pendingProofs: number;
  paidAmount: number;
  dailyVisits: { day: string; visits: number }[];
  paymentBreakdown: { provider: string; channel: string; orders: number; amount: number }[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/dashboard', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? 'Impossible de charger les statistiques.');
      } else {
        setStats(data.stats);
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
    void loadStats();
    const intervalId = window.setInterval(() => void loadStats(), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const maxDailyVisits = Math.max(1, ...(stats?.dailyVisits.map((day) => day.visits) ?? []));

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <Link href="/" className="text-lg font-black tracking-[0.16em] text-cyan-200">BMF ADMIN</Link>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Vue d’ensemble</p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin/orders" className="text-white hover:text-cyan-200">Commandes</Link>
            <Link href="/admin/payments" className="text-white hover:text-cyan-200">Paiements QR</Link>
            <Link href="/admin/events" className="text-white hover:text-cyan-200">Événements IA</Link>
          </nav>
        </header>

        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Activité du site</p>
            <h1 className="mt-2 text-3xl font-black text-white">Tableau de bord</h1>
          </div>
          <p className="text-xs text-slate-500">Présence active estimée sur les 2 dernières minutes</p>
        </div>

        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>}
        {loading && !stats ? <div className="py-16 text-center text-slate-400">Chargement des statistiques…</div> : stats && (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs du site">
              <article className="card p-5">
                <p className="text-sm text-slate-400">Visites aujourd’hui</p>
                <p className="mt-3 text-3xl font-black text-white">{stats.visitsToday.toLocaleString('fr-FR')}</p>
                <p className="mt-1 text-xs text-slate-500">{stats.uniqueVisitorsToday.toLocaleString('fr-FR')} visiteurs distincts estimés</p>
              </article>
              <article className="card p-5">
                <p className="text-sm text-slate-400">En ligne maintenant</p>
                <p className="mt-3 text-3xl font-black text-emerald-300">{stats.onlineNow.toLocaleString('fr-FR')}</p>
                <p className="mt-1 text-xs text-slate-500">activité au cours des 2 dernières minutes</p>
              </article>
              <article className="card p-5">
                <p className="text-sm text-slate-400">Comptes enregistrés</p>
                <p className="mt-3 text-3xl font-black text-cyan-200">{stats.registeredUsers.toLocaleString('fr-FR')}</p>
                <p className="mt-1 text-xs text-slate-500">profils Supabase Auth</p>
              </article>
              <article className="card p-5">
                <p className="text-sm text-slate-400">Montant confirmé</p>
                <p className="mt-3 break-words text-2xl font-black text-amber-200">{formatHtgAmount(stats.paidAmount)}</p>
                <p className="mt-1 text-xs text-slate-500">{stats.paidOrders.toLocaleString('fr-FR')} paiements confirmés par l’admin</p>
              </article>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <article className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Trafic récent</h2>
                    <p className="mt-1 text-xs text-slate-400">{stats.visitsMonth.toLocaleString('fr-FR')} visites sur les 30 derniers jours</p>
                  </div>
                  <span className="text-xs text-slate-500">7 derniers jours</span>
                </div>
                <div className="mt-7 flex h-44 items-end gap-3 border-b border-white/10 pb-2" role="img" aria-label="Visites quotidiennes des sept derniers jours">
                  {stats.dailyVisits.map((day) => (
                    <div key={day.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <span className="text-[10px] text-slate-400">{day.visits}</span>
                      <div title={`${day.visits} visites`} className="w-full max-w-12 rounded-t-sm bg-cyan-400/80" style={{ height: `${Math.max(4, (day.visits / maxDailyVisits) * 100)}%` }} />
                      <span className="text-[10px] text-slate-500">{new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(new Date(`${day.day}T12:00:00`))}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">Paiements reçus</h2>
                    <p className="mt-1 text-xs text-slate-400">Répartition des commandes confirmées</p>
                  </div>
                  <Link href="/admin/orders" className="text-xs font-semibold text-cyan-300 hover:text-cyan-100">Détails</Link>
                </div>
                <div className="mt-5 space-y-3">
                  {stats.paymentBreakdown.length ? stats.paymentBreakdown.map((item) => (
                    <div key={`${item.provider}-${item.channel}`} className="flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-sm">
                      <div>
                        <p className="font-semibold text-white">{item.provider === 'natcash' ? 'NatCash' : 'MonCash'} · {item.channel === 'qr' ? 'QR' : 'numéro'}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.orders} commandes</p>
                      </div>
                      <p className="text-right font-semibold text-emerald-200">{formatHtgAmount(item.amount)}</p>
                    </div>
                  )) : <p className="py-6 text-sm text-slate-500">Aucun paiement confirmé.</p>}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-3 text-sm">
                  <span className="text-amber-100">Preuves à vérifier</span>
                  <strong className="text-amber-200">{stats.pendingProofs}</strong>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
