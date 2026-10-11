'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type OrderRow = {
  id: string;
  uid: string;
  reference: string | null;
  payment_method: string;
  payment_channel: 'phone' | 'qr';
  pack_name: string;
  amount: string;
  status: 'awaiting_payment' | 'pending' | 'paid' | 'rejected';
  fulfillment_status: 'waiting_payment' | 'waiting_stock' | 'delivered' | 'legacy';
  transaction_id: string | null;
  payment_phone: string | null;
  proof_url: string | null;
  created_at: string;
};

const badgeClass: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-300',
  awaiting_payment: 'bg-slate-500/10 text-slate-300',
  paid: 'bg-emerald-500/10 text-emerald-300',
  rejected: 'bg-rose-500/10 text-rose-300',
};

const statusLabel: Record<string, string> = {
  awaiting_payment: 'Paiement attendu',
  pending: 'Preuve à vérifier',
  paid: 'Payée',
  rejected: 'Refusée',
};

const fulfillmentLabel: Record<string, string> = {
  waiting_payment: 'Après paiement',
  waiting_stock: 'Payée · stock attendu',
  delivered: 'Code livré',
  legacy: 'Ancienne commande',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/orders', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error ?? 'Impossible de charger les commandes.');
      } else {
        setErrorMessage(null);
        setOrders(data.orders ?? []);
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
    void loadOrders();
  }, []);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending').length;
    const paid = orders.filter((order) => order.status === 'paid').length;

    return {
      total: orders.length,
      pending,
      paid,
    };
  }, [orders]);

  const handleReview = async (id: string, status: 'paid' | 'rejected') => {
    setSavingOrderId(id);
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ orderId: id, status }),
      });

      if (response.ok) {
        const data = await response.json();
        setInfoMessage(status === 'paid'
          ? data.order?.fulfillment_status === 'delivered'
            ? 'Paiement confirmé et code attribué au joueur.'
            : 'Paiement confirmé. La commande attend un code dans le stock.'
          : 'Commande refusée.');
        await loadOrders();
      } else {
        const data = await response.json();
        setErrorMessage(data.error ?? 'La commande n’a pas pu être mise à jour.');
      }
    } catch {
      setErrorMessage('Connexion au serveur impossible. Réessayez.');
    } finally {
      setSavingOrderId(null);
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
              BMF Admin
            </Link>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin" className="text-cyan-200 hover:text-white">Tableau de bord</Link>
            <Link href="/admin/payments" className="text-cyan-200 hover:text-white">QR marchands</Link>
            <Link href="/admin/events" className="text-violet-200 hover:text-violet-100">Événements IA</Link>
          </nav>
        </header>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Back office</p>
          <h1 className="mt-3 text-4xl font-black text-white">Validation des paiements</h1>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <div className="text-sm text-slate-400">Total</div>
            <div className="mt-3 text-3xl font-black text-white">{stats.total}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-slate-400">Preuves à vérifier</div>
            <div className="mt-3 text-3xl font-black text-amber-300">{stats.pending}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-slate-400">Validés</div>
            <div className="mt-3 text-3xl font-black text-emerald-300">{stats.paid}</div>
          </div>
        </div>

        {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>}
        {infoMessage && <div role="status" className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{infoMessage}</div>}

        {loading ? (
          <div className="card p-10 text-center text-slate-300">Chargement des commandes…</div>
        ) : orders.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Commande</th>
                    <th className="px-6 py-4">Référence</th>
                    <th className="px-6 py-4">UID</th>
                    <th className="px-6 py-4">Pack</th>
                    <th className="px-6 py-4">Montant</th>
                    <th className="px-6 py-4">Paiement</th>
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Preuve</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Livraison</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-white/10">
                      <td className="px-6 py-4 font-medium text-white">{order.id.slice(0, 8)}</td>
                      <td className="px-6 py-4 font-mono text-xs">{order.reference ?? 'Ancienne commande'}</td>
                      <td className="px-6 py-4">{order.uid}</td>
                      <td className="px-6 py-4">{order.pack_name}</td>
                      <td className="px-6 py-4">{order.amount}</td>
                      <td className="px-6 py-4">{order.payment_method} · {order.payment_channel === 'qr' ? 'QR' : 'numéro'}</td>
                      <td className="px-6 py-4">
                        <div>{order.transaction_id ?? '—'}</div>
                        {order.payment_phone && <div className="mt-1 text-xs text-slate-400">{order.payment_phone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {order.proof_url ? <a href={order.proof_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-100">Ouvrir</a> : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-pill ${badgeClass[order.status] ?? 'bg-slate-500/10 text-slate-300'}`}>
                          {statusLabel[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">
                        {fulfillmentLabel[order.fulfillment_status] ?? order.fulfillment_status}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {order.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" disabled={savingOrderId === order.id} onClick={() => void handleReview(order.id, 'paid')} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50">Confirmer payé</button>
                            <button type="button" disabled={savingOrderId === order.id} onClick={() => void handleReview(order.id, 'rejected')} className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50">Refuser</button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card p-10 text-center text-slate-300">
            Aucune commande n’est encore enregistrée.
          </div>
        )}
      </div>
    </main>
  );
}
