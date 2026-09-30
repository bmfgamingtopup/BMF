import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { authenticateRequest } from '@/lib/supabase/request';
import { normalizeCurrencyLabel } from '@/lib/currency';

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request, 'customer');
    if (auth.response) return auth.response;

    const body = await request.json();
    const payment = String(body.payment ?? '').toLowerCase();
    const paymentChannel = String(body.paymentChannel ?? 'phone').toLowerCase();
    const type = body.type === 'giftcard' ? 'giftcard' : 'topup';
    const productId = String(body.productId ?? '');
    const uid = String(body.uid ?? '').trim();

    if (!['moncash', 'natcash'].includes(payment) || !['phone', 'qr'].includes(paymentChannel) || !productId || (type === 'topup' && !uid)) {
      return NextResponse.json({ error: 'Informations de commande invalides.' }, { status: 400 });
    }

    const { client, user } = auth;
    const { data: paymentSetup, error: paymentSetupError } = await client
      .from('payment_channels')
      .select('receiver_phone, qr_path')
      .eq('provider', payment)
      .maybeSingle();

    if (paymentSetupError) {
      return NextResponse.json({ error: 'Configuration des paiements indisponible. Exécutez le schéma Supabase à jour.' }, { status: 503 });
    }

    const receiverPhone = paymentSetup
      ? paymentSetup.receiver_phone
      : payment === 'moncash'
        ? process.env.NEXT_PUBLIC_MONCASH_RECEIVER ?? ''
        : process.env.NEXT_PUBLIC_NATCASH_RECEIVER ?? '';
    if ((paymentChannel === 'phone' && !receiverPhone) || (paymentChannel === 'qr' && !paymentSetup?.qr_path)) {
      return NextResponse.json({ error: `Le ${paymentChannel === 'qr' ? 'code QR' : 'numéro de réception'} ${payment === 'moncash' ? 'MonCash' : 'NatCash'} n’est pas encore configuré.` }, { status: 400 });
    }

    let qrUrl: string | null = null;
    if (paymentChannel === 'qr' && paymentSetup?.qr_path) {
      const { data: signedQr, error: signedQrError } = await client.storage
        .from('merchant-qrs')
        .createSignedUrl(paymentSetup.qr_path, 3600);
      if (signedQrError) {
        return NextResponse.json({ error: 'Impossible de charger le QR marchand.' }, { status: 503 });
      }
      qrUrl = signedQr.signedUrl;
    }

    const table = type === 'topup' ? 'top_up_packs' : 'gift_cards';
    const { data: product, error: productError } = await client
      .from(table)
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Produit indisponible.' }, { status: 400 });
    }

    const reference = `BMF-${payment === 'moncash' ? 'MC' : 'NC'}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

    const { data, error } = await client
      .from('orders')
      .insert({
        uid: type === 'topup' ? uid : productId,
        user_id: user.id,
        payment_method: payment,
        payment_channel: paymentChannel,
        pack_name: type === 'topup' ? product.name : `${product.type} ${product.name}`,
        diamond_count: type === 'topup' ? product.diamonds : product.value,
        amount: normalizeCurrencyLabel(type === 'topup' ? product.price : product.value),
        status: 'awaiting_payment',
        order_type: type,
        reference,
      })
      .select('id, reference, amount, payment_method, payment_channel, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      order: data,
      message: 'Commande créée. Effectuez le paiement puis envoyez le justificatif.',
      paymentMethod: payment,
      paymentChannel,
      paymentInstructions: { receiverPhone: paymentChannel === 'phone' ? receiverPhone : null, qrUrl },
      reference,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
