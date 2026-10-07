'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type Provider = 'moncash' | 'natcash';
type PaymentChannel = { provider: Provider; receiver_phone: string; qr_path: string | null; qr_url: string | null };

const providerLabels: Record<Provider, string> = { moncash: 'MonCash', natcash: 'NatCash' };
const blankChannels: Record<Provider, PaymentChannel> = {
  moncash: { provider: 'moncash', receiver_phone: '', qr_path: null, qr_url: null },
  natcash: { provider: 'natcash', receiver_phone: '', qr_path: null, qr_url: null },
};

export default function AdminPaymentsPage() {
  const [channels, setChannels] = useState(blankChannels);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<Provider | null>(null);
  const [messages, setMessages] = useState<Partial<Record<Provider, { error: boolean; text: string }>>>({});

  const loadChannels = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/payment-channels', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Impossible de charger les moyens de paiement.');
      setChannels((current) => ({
        ...current,
        ...Object.fromEntries((data.channels ?? []).map((channel: PaymentChannel) => [channel.provider, channel])),
      }));
    } catch (error) {
      setMessages({ moncash: { error: true, text: error instanceof Error ? error.message : 'Erreur de chargement.' } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChannels();
  }, []);

  const saveChannel = async (form: HTMLFormElement, provider: Provider, removeQr = false) => {
    setSavingProvider(provider);
    setMessages((current) => ({ ...current, [provider]: undefined }));

    try {
      const accessToken = await getAccessToken();
      const formData = new FormData(form);
      formData.set('provider', provider);
      formData.set('removeQr', String(removeQr));
      if (removeQr) formData.delete('qr');
      const response = await fetch('/api/admin/payment-channels', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Enregistrement impossible.');
      setChannels((current) => ({ ...current, [provider]: data.channel }));
      setMessages((current) => ({
        ...current,
        [provider]: { error: false, text: removeQr ? 'QR supprimé.' : 'Configuration enregistrée.' },
      }));
      form.reset();
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [provider]: { error: true, text: error instanceof Error ? error.message : 'Erreur réseau.' },
      }));
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <Link href="/admin" className="text-lg font-black tracking-[0.16em] text-cyan-200">BMF ADMIN</Link>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Réception des paiements</p>
          </div>
          <nav className="flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/admin" className="text-white hover:text-cyan-200">Dashboard</Link>
            <Link href="/admin/orders" className="text-white hover:text-cyan-200">Commandes</Link>
            <Link href="/admin/events" className="text-white hover:text-cyan-200">Événements IA</Link>
          </nav>
        </header>

        <div className="mb-7">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Comptes marchands</p>
          <h1 className="mt-2 text-3xl font-black text-white">Numéros et codes QR</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Ajoutez les coordonnées et les images QR officiels de vos comptes marchands. Les paiements restent à vérifier dans votre portefeuille avant confirmation.</p>
        </div>

        {loading ? <div className="py-12 text-center text-slate-400">Chargement des configurations…</div> : (
          <div className="grid gap-5 lg:grid-cols-2">
            {(['moncash', 'natcash'] as const).map((provider) => {
              const channel = channels[provider];
              const message = messages[provider];
              return (
                <section key={provider} className="card p-5 sm:p-6">
                  <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white">{providerLabels[provider]}</h2>
                    <span className="text-xs text-slate-500">Clients: numéro ou QR</span>
                  </div>
                  <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void saveChannel(event.currentTarget, provider); }}>
                    <label className="block text-sm text-slate-300">Numéro de réception
                      <input name="receiverPhone" type="tel" autoComplete="tel" value={channel.receiver_phone} onChange={(event) => setChannels((current) => ({ ...current, [provider]: { ...current[provider], receiver_phone: event.target.value } }))} className="field" placeholder="Ex. +509 …" />
                    </label>
                    <label className="block text-sm text-slate-300">Image QR marchand (JPG, PNG ou WebP, 5 Mo max.)
                      <input name="qr" type="file" accept="image/jpeg,image/png,image/webp" className="field" />
                    </label>
                    {channel.qr_path && (
                      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white p-3">
                        {channel.qr_url && <Image src={channel.qr_url} alt={`QR marchand ${providerLabels[provider]}`} width={112} height={112} unoptimized className="h-28 w-28 object-contain" />}
                        <div>
                          <p className="text-sm font-semibold text-slate-900">QR actif</p>
                          <button
                            type="button"
                            disabled={savingProvider === provider}
                            onClick={(event) => {
                              const form = event.currentTarget.form;
                              if (form && window.confirm(`Supprimer le QR ${providerLabels[provider]} ?`)) {
                                void saveChannel(form, provider, true);
                              }
                            }}
                            className="mt-2 text-xs font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900 disabled:opacity-50"
                          >
                            Supprimer le QR
                          </button>
                        </div>
                      </div>
                    )}
                    {message && <p role="status" className={`text-sm ${message.error ? 'text-rose-300' : 'text-emerald-300'}`}>{message.text}</p>}
                    <button type="submit" disabled={savingProvider === provider} className="primary-btn w-full disabled:opacity-50">
                      {savingProvider === provider ? 'Enregistrement…' : `Enregistrer ${providerLabels[provider]}`}
                    </button>
                  </form>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
