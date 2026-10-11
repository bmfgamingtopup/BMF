'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CreditCard,
  Gamepad2,
  Gift,
  LogOut,
  Menu,
  Newspaper,
  ReceiptText,
  Sparkles,
  UserRound,
  Vote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchCatalogData, type AiEvent, type CatalogData } from '@/lib/data';
import { createSupabaseClient } from '@/lib/supabase/client';

type PlayerTab = 'menu' | 'orders' | 'notifications' | 'surveys' | 'news' | 'account';
type PlayerProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  freeFireId: string;
  createdAt: string;
  emailConfirmed: boolean;
};
type PlayerOrder = {
  id: string;
  reference: string | null;
  pack_name: string;
  amount: string;
  status: 'awaiting_payment' | 'pending' | 'paid' | 'rejected';
  order_type: 'topup' | 'giftcard';
  fulfillment_status: 'waiting_payment' | 'waiting_stock' | 'delivered' | 'legacy';
  created_at: string;
  delivery_code: string | null;
};
type PlayerSurvey = {
  id: string;
  title: string;
  question: string;
  options: string[];
  votedOptionIndex: number | null;
};

const tabs: { id: PlayerTab; label: string; icon: typeof Menu }[] = [
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'orders', label: 'Commandes', icon: ReceiptText },
  { id: 'notifications', label: 'Alertes', icon: Bell },
  { id: 'surveys', label: 'Sondages', icon: Vote },
  { id: 'news', label: 'Actualités', icon: Newspaper },
  { id: 'account', label: 'Compte', icon: UserRound },
];

const orderStatusLabels: Record<PlayerOrder['status'], string> = {
  awaiting_payment: 'Paiement attendu',
  pending: 'Paiement en vérification',
  paid: 'Paiement confirmé',
  rejected: 'Paiement refusé',
};

const fulfillmentStatusLabels: Record<PlayerOrder['fulfillment_status'], string> = {
  waiting_payment: 'Livraison après validation du paiement',
  waiting_stock: 'Paiement confirmé · code en préparation',
  delivered: 'Code reçu',
  legacy: 'Commande antérieure',
};

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
  const [orders, setOrders] = useState<PlayerOrder[]>([]);
  const [deliveryNotification, setDeliveryNotification] = useState<string | null>(null);
  const [unreadDeliveryIds, setUnreadDeliveryIds] = useState<string[]>([]);
  const [orderRefreshMessage, setOrderRefreshMessage] = useState<string | null>(null);
  const [copyingCodeId, setCopyingCodeId] = useState<string | null>(null);
  const knownDeliveredOrders = useRef<Set<string>>(new Set());
  const [surveys, setSurveys] = useState<PlayerSurvey[]>([]);
  const [surveySelections, setSurveySelections] = useState<Record<string, number>>({});
  const [surveyMessages, setSurveyMessages] = useState<Record<string, string>>({});
  const [votingSurveyId, setVotingSurveyId] = useState<string | null>(null);
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
      const [catalogData, ordersResponse, surveysResponse] = await Promise.all([
        fetchCatalogData(),
        fetch('/api/player/orders', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }),
        fetch('/api/player/surveys', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }),
      ]);
      const [ordersData, surveysData] = await Promise.all([ordersResponse.json(), surveysResponse.json()]);
      if (!ordersResponse.ok) throw new Error(ordersData.error ?? 'Impossible de charger les commandes.');
      if (!surveysResponse.ok) throw new Error(surveysData.error ?? 'Impossible de charger les sondages.');
      setCatalog(catalogData);
      const initialOrders: PlayerOrder[] = ordersData.orders ?? [];
      knownDeliveredOrders.current = new Set(initialOrders.filter((order) => order.fulfillment_status === 'delivered').map((order) => order.id));
      setUnreadDeliveryIds([]);
      setOrders(initialOrders);
      setSurveys(surveysData.surveys ?? []);
      setError(null);
      setLoading(false);
    } catch {
      setError('Impossible de charger votre espace joueur. Vérifiez votre connexion et réessayez.');
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadPlayerPage();
  }, [loadPlayerPage]);

  useEffect(() => {
    if (!profile) return;

    let checking = false;
    const refreshOrders = async () => {
      if (checking) return;
      checking = true;
      try {
        const client = createSupabaseClient();
        if (!client) throw new Error('Le service de connexion est indisponible.');
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError || !sessionData.session?.access_token) throw new Error('Reconnecte-toi pour actualiser tes commandes.');

        const response = await fetch('/api/player/orders', {
          headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Actualisation des commandes impossible.');

        const updatedOrders: PlayerOrder[] = data.orders ?? [];
        const newlyDelivered = updatedOrders.filter((order) =>
          order.fulfillment_status === 'delivered' && !knownDeliveredOrders.current.has(order.id),
        );
        for (const order of updatedOrders) {
          if (order.fulfillment_status === 'delivered') knownDeliveredOrders.current.add(order.id);
        }
        if (newlyDelivered.length) {
          setUnreadDeliveryIds((current) => [...new Set([...current, ...newlyDelivered.map((order) => order.id)])]);
          setDeliveryNotification(newlyDelivered.length === 1
            ? `${newlyDelivered[0].order_type === 'topup' ? 'PIN Free Fire reçu' : 'Carte cadeau reçue'} pour ${newlyDelivered[0].pack_name}.`
            : `${newlyDelivered.length} nouvelles livraisons reçues.`);
        }
        setOrders(updatedOrders);
        setOrderRefreshMessage(null);
      } catch (refreshError) {
        setOrderRefreshMessage(refreshError instanceof Error ? refreshError.message : 'Actualisation des commandes impossible.');
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(() => void refreshOrders(), 20_000);
    return () => window.clearInterval(interval);
  }, [profile]);

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

  const copyDeliveryCode = async (orderId: string, code: string) => {
    try {
      setCopyingCodeId(orderId);
      await navigator.clipboard.writeText(code);
      setDeliveryNotification(`Code copié pour ${orderId.slice(0, 8)}.`);
    } catch {
      setOrderRefreshMessage('Le code n’a pas pu être copié. Sélectionne-le manuellement.');
    } finally {
      setCopyingCodeId(null);
    }
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

  const handleSurveyVote = async (surveyId: string) => {
    const optionIndex = surveySelections[surveyId];
    if (optionIndex === undefined) {
      setSurveyMessages((current) => ({ ...current, [surveyId]: 'Choisis une réponse avant de voter.' }));
      return;
    }

    const client = createSupabaseClient();
    if (!client) {
      setSurveyMessages((current) => ({ ...current, [surveyId]: 'Le service de connexion est indisponible.' }));
      return;
    }
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setSurveyMessages((current) => ({ ...current, [surveyId]: 'Reconnecte-toi pour envoyer ton vote.' }));
      return;
    }

    setVotingSurveyId(surveyId);
    setSurveyMessages((current) => ({ ...current, [surveyId]: '' }));
    try {
      const response = await fetch('/api/player/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ surveyId, optionIndex }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Ton vote n’a pas pu être enregistré.');
      setSurveys((current) => current.map((survey) => survey.id === surveyId ? { ...survey, votedOptionIndex: optionIndex } : survey));
      setSurveyMessages((current) => ({ ...current, [surveyId]: 'Merci, ta réponse a bien été enregistrée.' }));
    } catch (voteError) {
      setSurveyMessages((current) => ({
        ...current,
        [surveyId]: voteError instanceof Error ? voteError.message : 'Ton vote n’a pas pu être enregistré.',
      }));
    } finally {
      setVotingSurveyId(null);
    }
  };

  const displayName = getDisplayName(profile);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080b16] px-5 text-sm text-slate-300">Chargement de votre espace joueur…</main>;
  }

  return (
    <main className="min-h-screen bg-[#080b16] pb-32 text-slate-100">
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
        {deliveryNotification && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <span><strong>Nouvelle livraison !</strong> {deliveryNotification}</span>
            <button type="button" onClick={() => { setActiveTab('notifications'); setUnreadDeliveryIds([]); setDeliveryNotification(null); }} className="shrink-0 font-semibold underline underline-offset-4">Voir la notification</button>
          </div>
        )}
        {orderRefreshMessage && <p role="status" className="mb-5 text-xs text-amber-200">{orderRefreshMessage}</p>}
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

        <section id="player-panel" role="tabpanel" aria-labelledby={`player-tab-${activeTab}`}>
          {activeTab === 'menu' && (
            <div className="space-y-8">
              {orders.some((order) => order.fulfillment_status === 'delivered') && (
                <button type="button" onClick={() => setActiveTab('orders')} className="flex w-full items-center gap-3 rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200"><ReceiptText className="h-5 w-5" aria-hidden="true" /></span>
                  <span><strong className="block text-sm text-emerald-100">PIN reçu</strong><span className="mt-1 block text-xs text-emerald-200/80">Ton code est disponible dans l’onglet Commandes.</span></span>
                </button>
              )}
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

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Suivi et notifications</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Mes commandes</h2>
              </div>
              {orders.length ? orders.map((order) => (
                <article key={order.id} className={`rounded-2xl border p-5 ${order.fulfillment_status === 'delivered' ? 'border-emerald-300/25 bg-emerald-500/[0.06]' : 'border-white/10 bg-[#111827]/80'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{order.pack_name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{order.reference ?? order.id.slice(0, 8)} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(order.created_at))}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200">{order.amount}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    <span className={order.status === 'rejected' ? 'text-rose-300' : order.status === 'paid' ? 'text-emerald-300' : 'text-amber-200'}>{orderStatusLabels[order.status]}</span>
                    <span className={order.fulfillment_status === 'delivered' ? 'font-semibold text-emerald-300' : 'text-slate-400'}>{fulfillmentStatusLabels[order.fulfillment_status]}</span>
                  </div>
                  {order.delivery_code && (
                    <div className="mt-4 rounded-xl border border-emerald-300/20 bg-[#080b16]/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">PIN reçu · à utiliser pour {order.order_type === 'topup' ? 'ta recharge' : 'ta carte cadeau'}</p>
                        <button type="button" onClick={() => void copyDeliveryCode(order.id, order.delivery_code!)} className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200 transition hover:bg-emerald-500/15">
                          {copyingCodeId === order.id ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                      <code className="mt-2 block break-all text-sm font-bold tracking-wide text-white">{order.delivery_code}</code>
                    </div>
                  )}
                </article>
              )) : (
                <Card className="p-7 text-center text-sm text-slate-400">Aucune commande pour le moment. Tes achats apparaîtront ici avec leur statut de livraison.</Card>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Centre de notifications</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Livraisons reçues</h2>
                <p className="mt-2 text-sm text-slate-400">Retrouve ici les PIN Free Fire et les codes de cartes cadeaux livrés après validation du paiement.</p>
              </div>
              {orders.filter((order) => order.fulfillment_status === 'delivered').length ? (
                orders.filter((order) => order.fulfillment_status === 'delivered').map((order) => (
                  <article key={order.id} className="rounded-2xl border border-emerald-300/25 bg-emerald-500/[0.06] p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200">
                        <Bell className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white">{order.order_type === 'topup' ? 'PIN Free Fire reçu' : 'Carte cadeau reçue'}</h3>
                        <p className="mt-1 text-sm text-slate-300">{order.pack_name}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.reference ?? order.id.slice(0, 8)} · {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(order.created_at))}</p>
                      </div>
                    </div>
                    {order.delivery_code ? (
                      <div className="mt-4 rounded-xl border border-emerald-300/20 bg-[#080b16]/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Ton code est prêt</p>
                          <button type="button" onClick={() => void copyDeliveryCode(order.id, order.delivery_code!)} className="rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200 transition hover:bg-emerald-500/15">
                            {copyingCodeId === order.id ? 'Copié !' : 'Copier'}
                          </button>
                        </div>
                        <code className="mt-2 block break-all text-sm font-bold tracking-wide text-white">{order.delivery_code}</code>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-amber-200">Le code est en préparation. Consulte tes commandes dans un instant.</p>
                    )}
                  </article>
                ))
              ) : (
                <Card className="p-7 text-center text-sm text-slate-400">Aucune livraison pour le moment. Une notification apparaîtra ici dès qu’un code sera attribué à une commande.</Card>
              )}
            </div>
          )}

          {activeTab === 'surveys' && (
            <div className="space-y-4">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Ta voix compte</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Sondages BMF</h2>
              </div>
              {surveys.length ? surveys.map((survey) => (
                <Card key={survey.id} className="border-white/10 bg-[#111827]/90 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">{survey.title}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{survey.question}</h3>
                  <form className="mt-4 space-y-2" onSubmit={(event) => { event.preventDefault(); void handleSurveyVote(survey.id); }}>
                    {survey.options.map((option, index) => (
                      <label key={`${survey.id}-${option}`} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${survey.votedOptionIndex === index || surveySelections[survey.id] === index ? 'border-cyan-300/40 bg-cyan-400/10 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'}`}>
                        <input
                          type="radio"
                          name={`survey-${survey.id}`}
                          value={index}
                          checked={survey.votedOptionIndex === index || surveySelections[survey.id] === index}
                          disabled={survey.votedOptionIndex !== null || votingSurveyId === survey.id}
                          onChange={() => setSurveySelections((current) => ({ ...current, [survey.id]: index }))}
                          className="accent-cyan-400"
                        />
                        {option}
                      </label>
                    ))}
                    {survey.votedOptionIndex === null && (
                      <Button type="submit" disabled={votingSurveyId === survey.id || surveySelections[survey.id] === undefined} className="mt-2 w-full sm:w-auto">
                        {votingSurveyId === survey.id ? 'Envoi…' : 'Envoyer ma réponse'}
                      </Button>
                    )}
                    {surveyMessages[survey.id] && <p role="status" className={`text-sm ${survey.votedOptionIndex !== null ? 'text-emerald-300' : 'text-amber-200'}`}>{surveyMessages[survey.id]}</p>}
                  </form>
                </Card>
              )) : (
                <Card className="p-7 text-center text-sm text-slate-400">Aucun sondage actif. Reviens bientôt pour donner ton avis.</Card>
              )}
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

      <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl gap-1 overflow-x-auto rounded-2xl sm:grid sm:grid-cols-6 sm:overflow-visible border border-white/15 bg-[#111827]/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.5)] backdrop-blur-lg" role="tablist" aria-label="Navigation espace joueur">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} id={`player-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls="player-panel" aria-label={id === 'notifications' && unreadDeliveryIds.length ? `${label}, ${unreadDeliveryIds.length} non lue${unreadDeliveryIds.length > 1 ? 's' : ''}` : label} onClick={() => { setActiveTab(id); if (id === 'notifications') { setUnreadDeliveryIds([]); setDeliveryNotification(null); } window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`relative flex min-h-12 min-w-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 text-[11px] font-semibold transition sm:min-w-0 sm:flex-row sm:gap-2 sm:px-1 sm:text-xs ${activeTab === id ? 'bg-[#e43b34] text-white shadow-md shadow-red-950/30' : 'text-slate-400 hover:text-white'}`}>
            <span className="relative">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {id === 'notifications' && unreadDeliveryIds.length > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white" aria-hidden="true">
                  {unreadDeliveryIds.length > 9 ? '9+' : unreadDeliveryIds.length}
                </span>
              )}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
