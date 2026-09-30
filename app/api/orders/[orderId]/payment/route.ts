import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const proofExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const auth = await authenticateRequest(request, 'customer');
  if (auth.response) return auth.response;

  try {
    const { orderId } = await params;
    const formData = await request.formData();
    const transactionId = String(formData.get('transactionId') ?? '').trim();
    const paymentPhone = String(formData.get('paymentPhone') ?? '').trim();
    const proof = formData.get('proof');

    if (transactionId.length < 3 || transactionId.length > 120) {
      return NextResponse.json({ error: 'Saisissez un ID de transaction valide.' }, { status: 400 });
    }
    if (!(proof instanceof File) || proof.size === 0 || proof.size > 5 * 1024 * 1024 || !proofExtensions[proof.type]) {
      return NextResponse.json({ error: 'Ajoutez une preuve JPG, PNG, WebP ou PDF de 5 Mo maximum.' }, { status: 400 });
    }

    const { client, user } = auth;
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order || order.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'Cette commande ne peut plus recevoir de justificatif.' }, { status: 409 });
    }

    const proofPath = `${user.id}/${randomUUID()}.${proofExtensions[proof.type]}`;
    const { error: uploadError } = await client.storage
      .from('payment-proofs')
      .upload(proofPath, Buffer.from(await proof.arrayBuffer()), {
        contentType: proof.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Envoi du justificatif impossible : ${uploadError.message}` }, { status: 400 });
    }

    const { data, error } = await client
      .from('orders')
      .update({
        transaction_id: transactionId,
        payment_phone: paymentPhone || null,
        proof_path: proofPath,
        status: 'pending',
      })
      .eq('id', orderId)
      .eq('user_id', user.id)
      .eq('status', 'awaiting_payment')
      .select('id, reference, status')
      .single();

    if (error) {
      await client.storage.from('payment-proofs').remove([proofPath]);
      const status = error.code === '23505' ? 409 : 400;
      return NextResponse.json({ error: status === 409 ? 'Cet ID de transaction a déjà été utilisé.' : error.message }, { status });
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
