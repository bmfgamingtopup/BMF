'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchCatalogData, type TopUpPack } from '@/lib/data';
import { submitPaymentProof, submitTopUpOrder } from '@/lib/supabase/client';

export default function TopUpPage() {
  const [packs, setPacks] = useState<TopUpPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [uid, setUid] = useState('');
  const [payment, setPayment] = useState('moncash');
  const [paymentChannel, setPaymentChannel] = useState<'phone' | 'qr'>('phone');
  const [submitted, setSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{ id: string; reference: string; amount: string; payment_method: string; payment_channel: 'phone' | 'qr'; receiver_phone: string | null; qr_url: string | null } | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const data = await fetchCatalogData();
      if (!isMounted) return;
      setPacks(data.topUpPacks);
      setSelectedPackId(data.topUpPacks[0]?.id ?? '');
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0] ?? null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!selectedPack) {
      setStatusMessage('Aucun pack sélectionné.');
      return;
    }

    setLoading(true);
    const { data, error } = await submitTopUpOrder({
      uid,
      payment,
      paymentChannel,
      productId: selectedPack.id,
    });

    if (error) {
      setStatusMessage(error.message);
      setLoading(false);
      return;
    }

    setCreatedOrder({
      ...data.order,
      receiver_phone: data.paymentInstructions.receiverPhone,
      qr_url: data.paymentInstructions.qrUrl,
    });
    setStatusMessage(`Commande créée. Référence de paiement : ${data.order.reference}`);
    setLoading(false);
  };

  const handleProofSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createdOrder || !proofFile) return;
    setLoading(true);
    const { error } = await submitPaymentProof(createdOrder.id, { transactionId, paymentPhone, proof: proofFile });
    if (error) {
      setStatusMessage(error.message);
    } else {
      setSubmitted(true);
      setStatusMessage('Preuve reçue. Votre paiement est en attente de vérification.');
    }
    setLoading(false);
  };

  if (packs.length === 0) {
    return (
      <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <Image
            src="/images/free fire.jpg"
            alt=""
            fill
            priority
            unoptimized
            sizes="(min-width: 768px) 55vw, 100vw"
            className="empty-state-art object-cover object-[center_38%] opacity-45 sm:object-contain sm:object-right sm:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
        </div>
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6">
          <header className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="Retour à l’accueil" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-xl text-slate-200 transition hover:border-violet-400 hover:text-white">
                ←
              </Link>
              <Link href="/" aria-label="BMF Top Up, accueil" className="flex items-center">
                <Image src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png" alt="BMF Top Up" width={1320} height={1192} className="h-10 w-auto object-contain" />
              </Link>
            </div>
            <Link href="/giftcards" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Voir cartes cadeaux
            </Link>
          </header>

          <section className="flex flex-1 items-center py-14 sm:py-20">
            <div className="game-reveal max-w-xl">
              <div className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <span className="game-status-dot h-2 w-2 rounded-full bg-cyan-300" />
                Catalogue en cours de synchronisation
              </div>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Les recharges Free Fire sont momentanément indisponibles.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Aucun pack de diamants n’est disponible pour le moment. En attendant, découvre les cartes cadeaux numériques du catalogue.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/giftcards" className="primary-btn">
                  Découvrir les cartes cadeaux
                </Link>
                <Link href="/" className="secondary-btn">
                  Retour à l’accueil
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Retour à l’accueil" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/80 text-xl text-slate-200 transition hover:border-violet-400 hover:text-white">
              ←
            </Link>
            <Link href="/" aria-label="BMF Top Up, accueil" className="flex items-center">
              <Image src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png" alt="BMF Top Up" width={1320} height={1192} className="h-10 w-auto object-contain" />
            </Link>
          </div>
          <Link href="/giftcards" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Voir cartes cadeaux
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Recharge Free Fire</p>
              <h1 className="mt-3 text-4xl font-black text-white">Top-up diamants</h1>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              {packs.map((pack) => {
                const isSelected = pack.id === selectedPackId;

                return (
                  <article
                    key={pack.id}
                    className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-4 transition ${isSelected ? 'border-l-2 border-l-violet-400 bg-violet-500/8' : 'hover:bg-white/[0.03]'}`}
                    onClick={() => setSelectedPackId(pack.id)}
                  >
                    <div className="min-w-0">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-violet-200">{pack.tag}</div>
                      <h2 className="font-semibold text-white">{pack.name}</h2>
                      <p className="mt-1 text-sm text-slate-400">{pack.diamonds} diamants · Free Fire</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold text-white">{pack.price}</div>
                      <div className={`mt-1 text-xs ${isSelected ? 'text-violet-200' : 'text-slate-500'}`}>
                        {isSelected ? 'Sélectionné' : 'Choisir'}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="border-t border-white/10 pt-5 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h2 className="text-2xl font-bold text-white">Passer une commande</h2>
            {!createdOrder ? <form className="mt-5 space-y-4 text-sm text-slate-300" onSubmit={handleSubmit}>
              <label className="block">
                Player ID (UID)
                <input
                  type="text"
                  required
                  value={uid}
                  onChange={(event) => setUid(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </label>

              <label className="block">
                Pack choisi
                <select
                  value={selectedPackId}
                  onChange={(event) => setSelectedPackId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                >
                  {packs.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.name} - {pack.diamonds} diamants
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                Paiement
                <select
                  value={payment}
                  onChange={(event) => setPayment(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                >
                  <option value="moncash">MonCash</option>
                  <option value="natcash">NatCash</option>
                </select>
              </label>

              <div>
                <span className="mb-2 block">Mode de réception</span>
                <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-1" role="radiogroup" aria-label="Mode de réception du paiement">
                  {(['phone', 'qr'] as const).map((channel) => (
                    <button key={channel} type="button" role="radio" aria-checked={paymentChannel === channel} onClick={() => setPaymentChannel(channel)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${paymentChannel === channel ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:text-white'}`}>
                      {channel === 'phone' ? 'Numéro' : 'Code QR'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                <div className="font-semibold text-white">Résumé</div>
                <div className="mt-1">{selectedPack?.name} • {selectedPack?.diamonds} diamants</div>
                <div className="mt-1">Total estimé : {selectedPack?.price}</div>
              </div>

              <p className="text-xs text-slate-400">Connexion requise pour créer une commande. <Link href="/login" className="text-cyan-300 hover:text-cyan-100">Se connecter</Link> ou <Link href="/register" className="text-cyan-300 hover:text-cyan-100">créer un compte</Link>.</p>

              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 font-semibold text-white disabled:opacity-50">
                {loading ? 'Création…' : 'Créer la référence de paiement'}
              </button>
            </form> : submitted ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Référence <strong className="text-white">{createdOrder.reference}</strong> • statut : preuve reçue, vérification en attente.
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="font-semibold text-white">Paiement {createdOrder.payment_method === 'natcash' ? 'NatCash' : 'MonCash'} par {createdOrder.payment_channel === 'qr' ? 'QR' : 'numéro'}</p>
                  <p className="mt-2">Référence à indiquer : <strong className="text-cyan-100">{createdOrder.reference}</strong></p>
                  <p className="mt-2">Montant : <strong className="text-white">{createdOrder.amount}</strong></p>
                  {createdOrder.payment_channel === 'qr' && createdOrder.qr_url ? (
                    <div className="mt-4 rounded-xl bg-white p-3 text-center">
                      <Image src={createdOrder.qr_url} alt={`QR marchand ${createdOrder.payment_method}`} width={320} height={320} unoptimized className="mx-auto aspect-square max-h-64 w-auto object-contain" />
                      <p className="mt-2 text-xs text-slate-700">Scannez ce QR dans l’application {createdOrder.payment_method === 'natcash' ? 'NatCash' : 'MonCash'}.</p>
                    </div>
                  ) : createdOrder.payment_channel === 'phone' ? (
                    <p className="mt-2">Envoyer à : <strong className="text-white">{createdOrder.receiver_phone}</strong></p>
                  ) : <p className="mt-2 text-amber-200">Le QR marchand n’est plus disponible. Contactez l’administration.</p>}
                </div>
                <form className="space-y-4" onSubmit={handleProofSubmit}>
                  <label className="block">ID de transaction
                    <input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="field" required minLength={3} maxLength={120} />
                  </label>
                  <label className="block">Téléphone expéditeur
                    <input value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} className="field" type="tel" autoComplete="tel" />
                  </label>
                  <label className="block">Preuve de paiement (JPG, PNG, WebP ou PDF, 5 Mo max.)
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} className="field" required />
                  </label>
                  <button type="submit" disabled={loading} className="primary-btn w-full disabled:opacity-50">
                    {loading ? 'Envoi…' : 'Envoyer la preuve'}
                  </button>
                </form>
              </div>
            )}

            {statusMessage && (
              <div className={`mt-5 rounded-2xl border p-4 text-sm ${statusMessage.includes('succès') || statusMessage.includes('enregistrée') || statusMessage.includes('Preuve reçue') || statusMessage.includes('Commande créée') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>
                {statusMessage}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
