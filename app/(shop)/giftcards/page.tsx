'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchCatalogData, type GiftCard } from '@/lib/data';
import { submitGiftCardOrder, submitPaymentProof } from '@/lib/supabase/client';

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [ordered, setOrdered] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [payment, setPayment] = useState('moncash');
  const [paymentChannel, setPaymentChannel] = useState<'phone' | 'qr'>('phone');
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
      setCards(data.giftCards);
      setSelectedCardId(data.giftCards[0]?.id ?? '');
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null;

  const handleOrder = async () => {
    if (!selectedCard) {
      setStatusMessage('Aucune carte sélectionnée.');
      return;
    }

    setLoading(true);
    const { data, error } = await submitGiftCardOrder({ productId: selectedCard.id, payment, paymentChannel });

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
      setOrdered(true);
      setStatusMessage('Preuve reçue. Votre paiement est en attente de vérification.');
    }
    setLoading(false);
  };

  if (cards.length === 0) {
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
            <Link href="/topup" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Recharges FF
            </Link>
          </header>

          <section className="flex flex-1 items-center py-14 sm:py-20">
            <div className="game-reveal max-w-xl">
              <div className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                <span className="game-status-dot h-2 w-2 rounded-full bg-amber-300" />
                Catalogue en cours de synchronisation
              </div>
              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Les cartes cadeaux arrivent bientôt.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
                Aucune carte cadeau numérique n’est disponible pour le moment. En attendant, découvre les packs de diamants Free Fire.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/topup" className="primary-btn">
                  Voir les recharges Free Fire
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
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
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
          <Link href="/topup" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Recharges FF
          </Link>
        </header>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Cartes cadeaux</p>
          <h1 className="mt-3 text-4xl font-black text-white">Achetez un code cadeau numérique</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {cards.map((card) => {
              const isSelected = card.id === selectedCardId;

              return (
                <article
                  key={card.id}
                  className={`flex cursor-pointer items-center justify-between gap-4 px-3 py-4 transition ${isSelected ? 'border-l-2 border-l-amber-300 bg-amber-500/8' : 'hover:bg-white/[0.03]'}`}
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <div className="min-w-0">
                    <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">{card.type}</div>
                    <h2 className="font-semibold text-white">{card.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">Code instantané · Paiement sécurisé</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold text-amber-200">{card.value}</div>
                    <div className={`mt-1 text-xs ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                      {isSelected ? 'Sélectionné' : 'Choisir'}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="border-t border-white/10 pt-5 lg:sticky lg:top-6 lg:self-start lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h2 className="text-2xl font-bold text-white">Commande rapide</h2>
            <div className="mt-4 border-y border-amber-300/20 py-3">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Produit choisi</div>
              <div className="mt-2 font-semibold text-white">{selectedCard?.name}</div>
              <div className="mt-1 text-2xl font-bold text-amber-300">{selectedCard?.value}</div>
            </div>

            {!createdOrder && <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between border-b border-white/10 py-2">
                <span>Code</span>
                <span className="font-semibold text-white">Instantané</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 py-2">
                <span>Livraison</span>
                <span className="font-semibold text-white">1 à 3 min</span>
              </div>
              <label className="block">Paiement
                <select value={payment} onChange={(event) => setPayment(event.target.value)} className="field">
                  <option value="moncash">MonCash</option>
                  <option value="natcash">NatCash</option>
                </select>
              </label>
              <div>
                <span className="mb-2 block">Mode de réception</span>
                <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-slate-900 p-1" role="radiogroup" aria-label="Mode de réception du paiement">
                  {(['phone', 'qr'] as const).map((channel) => (
                    <button key={channel} type="button" role="radio" aria-checked={paymentChannel === channel} onClick={() => setPaymentChannel(channel)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${paymentChannel === channel ? 'bg-amber-300/20 text-amber-100' : 'text-slate-400 hover:text-white'}`}>
                      {channel === 'phone' ? 'Numéro' : 'Code QR'}
                    </button>
                  ))}
                </div>
              </div>
            </div>}

            {!createdOrder ? <button
              type="button"
              onClick={handleOrder}
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer la référence de paiement'}
            </button> : ordered ? (
              <div className="mt-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Référence <strong className="text-white">{createdOrder.reference}</strong> • statut : preuve reçue, vérification en attente.
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-sm text-slate-300">
                <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
                  <p>Paiement {createdOrder.payment_method === 'natcash' ? 'NatCash' : 'MonCash'} par {createdOrder.payment_channel === 'qr' ? 'QR' : 'numéro'} • {createdOrder.amount}</p>
                  <p className="mt-2">Référence : <strong className="text-white">{createdOrder.reference}</strong></p>
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

            {!createdOrder && <p className="mt-4 text-xs text-slate-400">Connexion requise pour créer une commande. <Link href="/login" className="text-cyan-300 hover:text-cyan-100">Se connecter</Link> ou <Link href="/register" className="text-cyan-300 hover:text-cyan-100">créer un compte</Link>.</p>}

            {statusMessage && (
              <div className={`mt-5 rounded-2xl border p-4 text-sm ${statusMessage.includes('succès') || statusMessage.includes('réservé') || statusMessage.includes('Preuve reçue') || statusMessage.includes('Commande créée') ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>
                {statusMessage}
                {ordered && selectedCard && (
                  <div className="mt-1 text-xs text-emerald-100">
                    Code <span className="font-bold text-white">{selectedCard.value}</span> en attente de validation.
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
