'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Gamepad2,
  Gift,
  LogOut,
  Menu,
  Newspaper,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchCatalogData, type AiEvent, type CatalogData } from '@/lib/data';
import { createSupabaseClient } from '@/lib/supabase/client';

type PlayerTab = 'menu' | 'news' | 'account';
type PlayerProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  freeFireId: string;
  createdAt: string;
  emailConfirmed: boolean;
};

const tabs: { id: PlayerTab; label: string; icon: typeof Menu }[] = [
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'news', label: 'Actualités', icon: Newspaper },
  { id: 'account', label: 'Compte joueur', icon: UserRound },
];

function getDisplayName(profile: PlayerProfile | null) {
  const name = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  return name || profile?.email.split('@')[0] || 'Joueur';
}

function NewsCard({ event }: { event: AiEvent }) {
  return (
    <Card className="overflow-hidden border-white/10 bg-[#111827]/90 text-slate-100">
      {event.image_url && (
        <div className="relative aspect-[16/8] overflow-hidden bg-slate-900">
          <Image src={event.image_url} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" unoptimized className="object-cover" />
        </div>
      )}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <time dateTime={event.date}>{event.date}</time>
          {event.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-1 text-violet-200">{tag}</span>
          ))}
        </div>
        <h3 className="mt-3 text-lg font-bold text-white">{event.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{event.summary}</p>
        {event.reward && <p className="mt-4 text-sm font-semibold text-amber-200">Récompense : {event.reward}</p>}
      </div>
    </Card>
  );
}

export default function PlayerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PlayerTab>('menu');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState({ firstName: '', lastName: '', freeFireId: '' });
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const loadPlayerPage = useCallback(async () => {
    const client = createSupabaseClient();
    if (!client) {
      setError('Le service de connexion est indisponible. Réessayez plus tard.');
      setLoading(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      setError('Impossible de vérifier votre connexion. Réessayez.');
      setLoading(false);
      return;
    }

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      setError('Impossible de charger votre profil. Reconnectez-vous.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        setError('Votre profil joueur est indisponible. Reconnectez-vous ou contactez le support.');
        setLoading(false);
        return;
      }

      const sessionProfile: { role: string; firstName: string | null; lastName: string | null; freeFireId: string | null } = await response.json();
      if (sessionProfile.role === 'admin') {
        router.replace('/admin');
        return;
      }
      if (sessionProfile.role !== 'customer') {
        setError('Ce compte ne dispose pas d’un profil joueur.');
        setLoading(false);
        return;
      }

      const playerProfile = {
        id: userData.user.id,
        email: userData.user.email ?? '',
        firstName: sessionProfile.firstName ?? '',
        lastName: sessionProfile.lastName ?? '',
        freeFireId: sessionProfile.freeFireId ?? '',
        createdAt: userData.user.created_at,
        emailConfirmed: Boolean(userData.user.email_confirmed_at),
      };
      setProfile(playerProfile);
      setProfileDraft({
        firstName: playerProfile.firstName,
        lastName: playerProfile.lastName,
        freeFireId: playerProfile.freeFireId,
      });
      setCatalog(await fetchCatalogData());
      setError(null);
      setLoading(false);
    } catch {
      setError('Impossible de charger votre espace joueur. Vérifiez votre connexion et réessayez.');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // The helper waits for authentication and profile requests before updating state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPlayerPage();
  }, [loadPlayerPage]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstName = profileDraft.firstName.trim();
    const lastName = profileDraft.lastName.trim();
    const freeFireId = profileDraft.freeFireId.trim();
    if (!profile || !firstName || !lastName) {
      setProfileMessage('Renseigne ton prénom et ton nom.');
      return;
    }
    if (freeFireId && !/^\d{6,20}$/.test(freeFireId)) {
      setProfileMessage('L’ID Free Fire doit contenir entre 6 et 20 chiffres.');
      return;
    }

    const client = createSupabaseClient();
    if (!client) {
      setProfileMessage('Le service de connexion est indisponible. Réessaie plus tard.');
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    const { error: updateError } = await client
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, free_fire_id: freeFireId })
      .eq('id', profile.id);

    if (updateError) {
      setProfileMessage('Impossible d’enregistrer ton profil. Réessaie.');
    } else {
      setProfile({ ...profile, firstName, lastName, freeFireId });
      setProfileDraft({ firstName, lastName, freeFireId });
      setProfileMessage('Ton profil a été mis à jour.');
    }
    setSavingProfile(false);
  };

  const handleSignOut = async () => {
    const client = createSupabaseClient();
    if (!client) {
      setError('Le service de connexion est indisponible. Réessayez plus tard.');
      return;
    }

    setSigningOut(true);
    const { error: signOutError } = await client.auth.signOut();
    if (signOutError) {
      setError('La déconnexion a échoué. Réessayez.');
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  };

  const displayName = getDisplayName(profile);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080b16] px-5 text-sm text-slate-300">Chargement de votre espace joueur…</main>;
  }

  return (
    <main className="min-h-screen bg-[#080b16] pb-28 text-slate-100 sm:pb-10">
      <header className="border-b border-white/10 bg-[#0b1020]/90">
        <div className="page-shell flex min-h-[76px] items-center justify-between gap-4">
          <Link href="/" aria-label="BMF Top Up, accueil" className="flex items-center gap-3">
            <Image src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png" alt="Logo BMF Top Up" width={1320} height={1192} priority className="h-11 w-11 object-contain" />
            <span className="text-sm font-extrabold tracking-wide text-white sm:text-base">BMF <span className="text-violet-300">TOP UP</span></span>
          </Link>
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-300/30 hover:text-white disabled:opacity-50">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{signingOut ? 'Déconnexion…' : 'Déconnexion'}</span>
          </button>
        </div>
      </header>

      <div className="page-shell py-8 sm:py-12">
        {error && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <span>{error}</span>
            <button type="button" onClick={() => { setError(null); setLoading(true); void loadPlayerPage(); }} className="font-semibold underline underline-offset-4">Réessayer</button>
          </div>
        )}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Espace joueur BMF</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Bienvenue, {displayName} <span aria-hidden="true">👋</span></h1>
            <p className="mt-2 text-sm text-slate-400">Retrouve tes jeux, les nouveautés et les informations de ton compte.</p>
          </div>
          <Link href="/topup" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110">
            Boutique <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-7 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#101626] p-1.5" role="tablist" aria-label="Navigation espace joueur">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`player-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`player-panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-xs font-semibold transition sm:text-sm ${activeTab === id ? 'bg-violet-500/20 text-violet-100 shadow-inner shadow-violet-300/10' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <section id={`player-panel-${activeTab}`} role="tabpanel" aria-labelledby={`player-tab-${activeTab}`}>
          {activeTab === 'menu' && (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/topup" className="group rounded-2xl border border-violet-300/15 bg-gradient-to-br from-violet-500/15 to-[#111827] p-5 transition hover:border-violet-300/40 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200"><Gamepad2 className="h-5 w-5" aria-hidden="true" /></span>
                    <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-violet-200" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-white">Jeux & recharges</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Retrouve les recharges disponibles et passe ta commande.</p>
                  <span className="mt-4 inline-flex rounded-full border border-violet-300/20 px-3 py-1 text-xs text-violet-200">{catalog?.topUpPacks.length ?? 0} offres disponibles</span>
                </Link>
                <Link href="/giftcards" className="group rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-400/10 to-[#111827] p-5 transition hover:border-amber-300/40 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-300/15 text-amber-200"><Gift className="h-5 w-5" aria-hidden="true" /></span>
                    <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-amber-200" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-white">Cartes cadeaux</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Explore les cartes numériques disponibles dans la boutique.</p>
                  <span className="mt-4 inline-flex rounded-full border border-amber-300/20 px-3 py-1 text-xs text-amber-200">{catalog?.giftCards.length ?? 0} cartes disponibles</span>
                </Link>
              </div>

              <div>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">À découvrir</p>
                    <h2 className="mt-2 text-xl font-bold text-white">Les dernières actualités</h2>
                  </div>
                  <button type="button" onClick={() => setActiveTab('news')} className="text-xs font-semibold text-cyan-200 hover:text-white">Tout voir →</button>
                </div>
                {catalog?.aiEvents.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {catalog.aiEvents.slice(0, 2).map((event) => <NewsCard key={event.id ?? event.title} event={event} />)}
                  </div>
                ) : (
                  <Card className="border-white/10 bg-[#111827]/80 p-5 text-sm text-slate-400">Aucune actualité publiée pour le moment. Reviens bientôt pour découvrir les nouveautés BMF.</Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-9">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Nouveautés BMF</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Actualités BMF</h2>
              </div>
              {catalog?.aiEvents.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {catalog.aiEvents.map((event) => <NewsCard key={event.id ?? event.title} event={event} />)}
                </div>
              ) : (
                <Card className="flex flex-col items-center px-6 py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-200"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
                  <h3 className="mt-4 font-semibold text-white">Rien de nouveau pour le moment</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Les actualités BMF apparaîtront ici dès leur publication.</p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-white/10 bg-[#111827]/90 p-5 sm:p-7">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-400/15 text-xl font-black text-violet-100">{displayName.slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.15em] text-violet-300">Compte joueur</p>
                    <h2 className="mt-1 truncate text-xl font-bold text-white">{displayName}</h2>
                  </div>
                </div>
                <dl className="mt-7 divide-y divide-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                    <dt className="text-sm text-slate-400">Adresse e-mail</dt>
                    <dd className="break-all text-sm font-medium text-slate-200">{profile?.email}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-4">
                    <dt className="text-sm text-slate-400">Vérification e-mail</dt>
                    <dd className={`text-sm font-medium ${profile?.emailConfirmed ? 'text-emerald-300' : 'text-amber-200'}`}>{profile?.emailConfirmed ? 'Vérifiée' : 'En attente'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-4">
                    <dt className="text-sm text-slate-400">Membre depuis</dt>
                    <dd className="text-sm font-medium text-slate-200">{profile?.createdAt ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt)) : '—'}</dd>
                  </div>
                </dl>
                <form className="mt-5 space-y-4 border-t border-white/10 pt-5" onSubmit={handleSaveProfile}>
                  <h3 className="text-sm font-semibold text-white">Informations du compte</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium text-slate-300">
                      Prénom
                      <Input value={profileDraft.firstName} onChange={(event) => setProfileDraft((current) => ({ ...current, firstName: event.target.value }))} autoComplete="given-name" required maxLength={80} className="border-white/10 bg-slate-950 text-white" />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium text-slate-300">
                      Nom
                      <Input value={profileDraft.lastName} onChange={(event) => setProfileDraft((current) => ({ ...current, lastName: event.target.value }))} autoComplete="family-name" required maxLength={80} className="border-white/10 bg-slate-950 text-white" />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium text-slate-300 sm:col-span-2">
                      ID joueur Free Fire
                      <Input value={profileDraft.freeFireId} onChange={(event) => setProfileDraft((current) => ({ ...current, freeFireId: event.target.value.replace(/\D/g, '').slice(0, 20) }))} inputMode="numeric" autoComplete="off" placeholder="Ex. 1234567890" maxLength={20} pattern="\d{6,20}" title="Entre 6 et 20 chiffres" className="border-white/10 bg-slate-950 text-white" />
                      <span className="block font-normal text-slate-500">Enregistre ton ID pour le retrouver automatiquement lors d’une recharge.</span>
                    </label>
                  </div>
                  {profileMessage && <p role="status" className={`text-sm ${profileMessage.startsWith('Ton profil') ? 'text-emerald-300' : 'text-rose-300'}`}>{profileMessage}</p>}
                  <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">{savingProfile ? 'Enregistrement…' : 'Enregistrer mon profil'}</Button>
                </form>
              </Card>
              <Card className="border-white/10 bg-[#111827]/90 p-5 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-bold text-white">Prêt à jouer ?</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">Choisis un pack dans la boutique pour commencer une recharge. Ton Player ID te sera demandé lors de la commande.</p>
                <Link href="/topup" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 text-sm font-semibold text-white transition hover:brightness-110">
                  Découvrir les recharges <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/giftcards" className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-200 hover:text-amber-100"><Gift className="h-4 w-4" aria-hidden="true" /> Voir les cartes cadeaux</Link>
              </Card>
            </div>
          )}
        </section>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto grid max-w-md grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-[#111827]/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.5)] backdrop-blur-lg sm:hidden" role="tablist" aria-label="Navigation espace joueur">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} id={`player-mobile-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-label={label} onClick={() => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition ${activeTab === id ? 'bg-[#e43b34] text-white shadow-md shadow-red-950/30' : 'text-slate-400 hover:text-white'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}
