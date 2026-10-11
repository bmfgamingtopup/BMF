'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type TopUpPack = { id: string; tag: string; name: string; diamonds: string; price: string };
type GiftCard = { id: string; type: string; name: string; value: string };
type Catalog = {
  archivedTopUpPacks: TopUpPack[];
  archivedGiftCards: GiftCard[];
};

async function fetchArchivedCatalog(): Promise<Catalog> {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/catalog', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Impossible de charger l’historique.');
  return data as Catalog;
}

async function updateArchive(catalog: 'topup' | 'giftcard', id: string, isArchived: boolean) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/catalog', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ catalog, id, is_archived: isArchived }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Impossible de modifier cette offre.');
}

export default function AdminCatalogHistoryPage() {
  const [catalog, setCatalog] = useState<Catalog>({ archivedTopUpPacks: [], archivedGiftCards: [] });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setCatalog(await fetchArchivedCatalog());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger l’historique.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for the authenticated API response before updating the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
  }, [loadHistory]);

  const restoreProduct = async (type: 'topup' | 'giftcard', id: string) => {
    setSavingId(id);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await updateArchive(type, id, false);
      await loadHistory();
      setInfoMessage('Offre restaurée dans le catalogue actif.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de restaurer cette offre.');
    } finally {
      setSavingId(null);
    }
  };

  const totalArchived = catalog.archivedTopUpPacks.length + catalog.archivedGiftCards.length;

  return (
    <main className="space-y-7">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Boutique</p>
        <h1 className="mt-2 text-3xl font-black text-white">Historique d’enregistrement</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Cette page sert uniquement à alléger la configuration du catalogue. Les offres archivées restent visibles et achetables par les joueurs.
        </p>
      </header>

      {errorMessage && <p role="alert" className="rounded-md border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</p>}
      {infoMessage && <p role="status" className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{infoMessage}</p>}

      {loading ? <p className="py-12 text-center text-slate-400">Chargement de l’historique…</p> : (
        <>
          <p className="text-xs text-slate-500">{totalArchived} offre{totalArchived === 1 ? '' : 's'} archivée{totalArchived === 1 ? '' : 's'}</p>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <section className="card p-5 sm:p-6">
              <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Packs diamants</h2>
                <span className="text-xs text-slate-500">{catalog.archivedTopUpPacks.length}</span>
              </header>
              <div className="space-y-3">
                {catalog.archivedTopUpPacks.map((pack) => (
                  <article key={pack.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 p-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{pack.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{pack.tag} · {pack.diamonds} diamants · {pack.price}</p>
                    </div>
                    <button type="button" disabled={savingId !== null} onClick={() => void restoreProduct('topup', pack.id)} className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50">
                      {savingId === pack.id ? 'Restauration…' : 'Restaurer'}
                    </button>
                  </article>
                ))}
                {!catalog.archivedTopUpPacks.length && <p className="py-3 text-sm text-slate-500">Aucun pack archivé.</p>}
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <header className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                <h2 className="text-xl font-bold text-white">Cartes cadeaux</h2>
                <span className="text-xs text-slate-500">{catalog.archivedGiftCards.length}</span>
              </header>
              <div className="space-y-3">
                {catalog.archivedGiftCards.map((card) => (
                  <article key={card.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-900/70 p-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{card.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{card.type} · {card.value}</p>
                    </div>
                    <button type="button" disabled={savingId !== null} onClick={() => void restoreProduct('giftcard', card.id)} className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50">
                      {savingId === card.id ? 'Restauration…' : 'Restaurer'}
                    </button>
                  </article>
                ))}
                {!catalog.archivedGiftCards.length && <p className="py-3 text-sm text-slate-500">Aucune carte archivée.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
