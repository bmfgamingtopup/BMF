'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type TopUpPack = { id: string; tag: string; name: string; diamonds: string; price: string };
type GiftCard = { id: string; type: string; name: string; value: string };
type Catalog = 'topup' | 'giftcard';
type Feedback = { error: boolean; text: string };

async function fetchCatalog() {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/catalog', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Impossible de charger le catalogue.');
  return data as { topUpPacks: TopUpPack[]; giftCards: GiftCard[] };
}

async function mutateCatalog(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/catalog', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Modification impossible.');
}

const amountInputValue = (value: string) => value.replace(/\D/g, '');
const inputClass = 'mt-1.5 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400';
const labelClass = 'block min-w-0 text-xs text-slate-400';

export default function AdminCatalogPage() {
  const [topUpPacks, setTopUpPacks] = useState<TopUpPack[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    void fetchCatalog()
      .then((catalog) => {
        if (!active) return;
        setTopUpPacks(catalog.topUpPacks);
        setGiftCards(catalog.giftCards);
      })
      .catch((error: unknown) => {
        if (active) setFeedback({ error: true, text: error instanceof Error ? error.message : 'Erreur de chargement.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshCatalog = async () => {
    const catalog = await fetchCatalog();
    setTopUpPacks(catalog.topUpPacks);
    setGiftCards(catalog.giftCards);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>, catalog: Catalog, id?: string) => {
    event.preventDefault();
    const form = event.currentTarget;
    const product = Object.fromEntries(new FormData(form).entries());
    const key = id ?? `${catalog}-new`;
    setSavingKey(key);
    setFeedback(null);

    try {
      await mutateCatalog(id ? 'PATCH' : 'POST', { catalog, id, product });
      await refreshCatalog();
      setFeedback({ error: false, text: id ? 'Produit mis à jour.' : 'Produit ajouté au catalogue.' });
      if (!id) form.reset();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Enregistrement impossible.' });
    } finally {
      setSavingKey(null);
    }
  };

  const deleteProduct = async (catalog: Catalog, id: string, name: string) => {
    if (!window.confirm(`Supprimer « ${name} » du catalogue ?`)) return;
    setSavingKey(id);
    setFeedback(null);
    try {
      await mutateCatalog('DELETE', { catalog, id });
      await refreshCatalog();
      setFeedback({ error: false, text: 'Produit supprimé.' });
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Suppression impossible.' });
    } finally {
      setSavingKey(null);
    }
  };

  return (
      <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-7">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Boutique</p>
            <h1 className="mt-2 text-3xl font-black text-white">Catalogue et tarifs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Les modifications sont enregistrées dans Supabase et visibles sur le site dès leur sauvegarde.</p>
          </header>

          {feedback && <p role="status" className={`mb-5 rounded-md border px-4 py-3 text-sm ${feedback.error ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>{feedback.text}</p>}

          {loading ? <p className="py-12 text-center text-slate-400">Chargement du catalogue…</p> : (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              <section className="card p-5 sm:p-6">
                <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold text-white">Diamants Free Fire</h2>
                  <span className="text-xs text-slate-500">{topUpPacks.length} packs</span>
                </header>

                <form className="grid gap-3 border-b border-white/10 pb-5 sm:grid-cols-2" onSubmit={(event) => void saveProduct(event, 'topup')}>
                  <label className={labelClass}>Tag
                    <input className={inputClass} name="tag" placeholder="POPULAIRE" required maxLength={40} />
                  </label>
                  <label className={labelClass}>Nom du pack
                    <input className={inputClass} name="name" placeholder="Pack 100 diamants" required maxLength={120} />
                  </label>
                  <label className={labelClass}>Diamants
                    <input className={inputClass} name="diamonds" type="number" min="1" step="1" placeholder="100" required />
                  </label>
                  <label className={labelClass}>Prix de vente (HTG)
                    <input className={inputClass} name="price" type="number" min="1" step="1" placeholder="500" required />
                  </label>
                  <button type="submit" disabled={savingKey !== null} className="primary-btn sm:col-span-2 disabled:opacity-50">
                    {savingKey === 'topup-new' ? 'Ajout…' : 'Ajouter un pack'}
                  </button>
                </form>

                <div className="divide-y divide-white/10">
                  {topUpPacks.map((pack) => (
                    <form key={pack.id} className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-[0.7fr_1.2fr_0.8fr_0.9fr_auto] xl:items-end" onSubmit={(event) => void saveProduct(event, 'topup', pack.id)}>
                      <label className={labelClass}>Tag
                        <input className={inputClass} name="tag" defaultValue={pack.tag} required maxLength={40} />
                      </label>
                      <label className={labelClass}>Nom
                        <input className={inputClass} name="name" defaultValue={pack.name} required maxLength={120} />
                      </label>
                      <label className={labelClass}>Diamants
                        <input className={inputClass} name="diamonds" type="number" min="1" step="1" defaultValue={pack.diamonds} required />
                      </label>
                      <label className={labelClass}>Prix (HTG)
                        <input className={inputClass} name="price" type="number" min="1" step="1" defaultValue={amountInputValue(pack.price)} required />
                      </label>
                      <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                        <button type="submit" disabled={savingKey !== null} className="secondary-btn flex-1 px-3 py-2 text-xs disabled:opacity-50">{savingKey === pack.id ? '…' : 'Enregistrer'}</button>
                        <button type="button" disabled={savingKey !== null} onClick={() => void deleteProduct('topup', pack.id, pack.name)} className="rounded-md border border-rose-400/25 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">Supprimer</button>
                      </div>
                    </form>
                  ))}
                  {!topUpPacks.length && <p className="py-5 text-sm text-slate-500">Aucun pack configuré.</p>}
                </div>
              </section>

              <section className="card p-5 sm:p-6">
                <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold text-white">Cartes cadeaux</h2>
                  <span className="text-xs text-slate-500">{giftCards.length} cartes</span>
                </header>

                <form className="grid gap-3 border-b border-white/10 pb-5 sm:grid-cols-2" onSubmit={(event) => void saveProduct(event, 'giftcard')}>
                  <label className={labelClass}>Type / marque
                    <input className={inputClass} name="type" placeholder="Google Play" required maxLength={60} />
                  </label>
                  <label className={labelClass}>Nom / valeur de la carte
                    <input className={inputClass} name="name" placeholder="Carte 10 USD" required maxLength={120} />
                  </label>
                  <label className={`${labelClass} sm:col-span-2`}>Prix de vente (HTG)
                    <input className={inputClass} name="value" type="number" min="1" step="1" placeholder="3 500" required />
                  </label>
                  <button type="submit" disabled={savingKey !== null} className="primary-btn sm:col-span-2 disabled:opacity-50">
                    {savingKey === 'giftcard-new' ? 'Ajout…' : 'Ajouter une carte'}
                  </button>
                </form>

                <div className="divide-y divide-white/10">
                  {giftCards.map((card) => (
                    <form key={card.id} className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_0.9fr_auto] xl:items-end" onSubmit={(event) => void saveProduct(event, 'giftcard', card.id)}>
                      <label className={labelClass}>Type / marque
                        <input className={inputClass} name="type" defaultValue={card.type} required maxLength={60} />
                      </label>
                      <label className={labelClass}>Nom / valeur
                        <input className={inputClass} name="name" defaultValue={card.name} required maxLength={120} />
                      </label>
                      <label className={labelClass}>Prix (HTG)
                        <input className={inputClass} name="value" type="number" min="1" step="1" defaultValue={amountInputValue(card.value)} required />
                      </label>
                      <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
                        <button type="submit" disabled={savingKey !== null} className="secondary-btn flex-1 px-3 py-2 text-xs disabled:opacity-50">{savingKey === card.id ? '…' : 'Enregistrer'}</button>
                        <button type="button" disabled={savingKey !== null} onClick={() => void deleteProduct('giftcard', card.id, card.name)} className="rounded-md border border-rose-400/25 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50">Supprimer</button>
                      </div>
                    </form>
                  ))}
                  {!giftCards.length && <p className="py-5 text-sm text-slate-500">Aucune carte configurée.</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
  );
}