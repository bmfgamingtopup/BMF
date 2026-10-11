'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type CatalogType = 'topup' | 'giftcard';
type StockProduct = {
  id: string;
  catalog_type: CatalogType;
  name: string;
  available: number;
  assigned: number;
};
type Feedback = { error: boolean; text: string };

async function requestStock(path: string, init?: RequestInit) {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Opération impossible.');
  return data;
}

export default function AdminStockPage() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [catalogType, setCatalogType] = useState<CatalogType>('topup');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const choices = useMemo(() => products.filter((product) => product.catalog_type === catalogType), [products, catalogType]);

  const loadStock = async () => {
    try {
      const data = await requestStock('/api/admin/stock');
      setProducts(data.products ?? []);
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Chargement du stock impossible.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for the authenticated API response before updating the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStock();
  }, []);

  const addCodes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(true);
    setFeedback(null);
    try {
      const data = await requestStock('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogType,
          productId: formData.get('productId'),
          codes: formData.get('codes'),
        }),
      });
      await loadStock();
      setFeedback({
        error: Boolean(data.warning),
        text: data.warning ?? `${data.inserted} code(s) ajouté(s). Les commandes payées en attente de stock ont été traitées automatiquement.`,
      });
      form.reset();
    } catch (error) {
      setFeedback({ error: true, text: error instanceof Error ? error.message : 'Ajout des codes impossible.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-7">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Livraison numérique</p>
        <h1 className="mt-2 text-3xl font-black text-white">Stock des PIN et cartes cadeaux</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Ajoute les codes réels fournis par tes distributeurs, un par ligne. Après confirmation du paiement, le code correspondant est attribué au joueur et n’est plus réutilisable.
        </p>
      </header>

      <section className="card max-w-3xl p-5 sm:p-7">
        <h2 className="text-lg font-bold text-white">Ajouter des codes au stock</h2>
        <form className="mt-5 space-y-4" onSubmit={(event) => void addCodes(event)}>
          <label className="block text-sm text-slate-300">Type d’offre
            <select
              className="field"
              value={catalogType}
              onChange={(event) => setCatalogType(event.target.value as CatalogType)}
            >
              <option value="topup">PIN / recharge Free Fire</option>
              <option value="giftcard">Carte cadeau</option>
            </select>
          </label>
          <label className="block text-sm text-slate-300">Offre du catalogue
            <select className="field" name="productId" required disabled={!choices.length}>
              {choices.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <label className="block text-sm text-slate-300">Codes à ajouter
            <textarea
              className="field min-h-36 resize-y font-mono text-xs"
              name="codes"
              required
              maxLength={125000}
              placeholder={'ABCD-EFGH-IJKL\nMNOP-QRST-UVWX'}
            />
            <span className="mt-1 block text-xs text-slate-500">Un code par ligne, 500 maximum par envoi. Les doublons déjà enregistrés sont ignorés.</span>
          </label>
          {feedback && <p role={feedback.error ? 'alert' : 'status'} className={`text-sm ${feedback.error ? 'text-rose-300' : 'text-emerald-300'}`}>{feedback.text}</p>}
          <button type="submit" disabled={saving || !choices.length} className="primary-btn w-full disabled:opacity-50">
            {saving ? 'Ajout et attribution en cours…' : 'Ajouter et livrer les commandes en attente'}
          </button>
          {!choices.length && <p className="text-sm text-amber-200">Crée d’abord une offre dans le catalogue avant d’ajouter son stock.</p>}
        </form>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">État du stock</h2>
          <p className="mt-1 text-sm text-slate-400">Les codes eux-mêmes ne sont jamais affichés dans cette liste.</p>
        </div>
        {loading ? <div className="card p-6 text-slate-400">Chargement du stock…</div> : products.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {products.map((product) => (
              <article key={`${product.catalog_type}:${product.id}`} className="card p-5">
                <p className="text-sm font-semibold text-white">{product.name}</p>
                <div className="mt-4 flex gap-6 text-xs">
                  <span className="text-emerald-300">Disponibles : {product.available}</span>
                  <span className="text-slate-400">Attribués : {product.assigned}</span>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="card p-6 text-sm text-slate-400">Aucune offre dans le catalogue.</div>}
      </section>
    </main>
  );
}
