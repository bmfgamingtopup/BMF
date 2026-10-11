import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;
  const { client } = auth;

  const { data, error } = await client
    .from('orders')
    .select('id, uid, user_id, reference, payment_method, payment_channel, pack_name, amount, status, order_type, fulfillment_status, transaction_id, payment_phone, proof_path, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const orders = await Promise.all((data ?? []).map(async (order) => {
    if (!order.proof_path) return { ...order, proof_url: null };
    const { data: proof } = await client.storage
      .from('payment-proofs')
      .createSignedUrl(order.proof_path, 300);
    return { ...order, proof_url: proof?.signedUrl ?? null };
  }));

  return NextResponse.json({ orders });
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateRequest(request, 'admin');
    if (auth.response) return auth.response;

    const body = await request.json();
    const { orderId, status } = body;
    if (!orderId || !['paid', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Décision de validation invalide.' }, { status: 400 });
    }

    if (status === 'paid') {
      const { data, error } = await auth.client.rpc('confirm_order_payment', { p_order_id: String(orderId) });
      if (error) {
        const conflict = /introuvable|déjà traitée|non livrable/i.test(error.message);
        return NextResponse.json({ error: error.message }, { status: conflict ? 409 : 400 });
      }
      const order = Array.isArray(data) ? data[0] : data;
      return NextResponse.json({ ok: true, order });
    }

    const { data, error } = await auth.client
      .from('orders')
      .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', String(orderId))
      .eq('status', 'pending')
      .select('id, status, reviewed_at, fulfillment_status')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) return NextResponse.json({ error: 'Commande introuvable ou déjà traitée.' }, { status: 409 });

    return NextResponse.json({ ok: true, order: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
