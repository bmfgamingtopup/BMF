import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;
  const { client } = auth;

  const { data, error } = await client
    .from('orders')
    .select('*')
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

    const { data, error } = await auth.client
      .from('orders')
      .update({ status, reviewed_by: auth.user.id, reviewed_at: new Date().toISOString() })
      .eq('id', String(orderId))
      .eq('status', 'pending')
      .select('id, status, reviewed_at')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Commande introuvable ou déjà traitée.' }, { status: 409 });
    }

    return NextResponse.json({ ok: true, order: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
