import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'customer');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null) as { orderId?: unknown; uid?: unknown } | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
  if (!uuidPattern.test(orderId)) return NextResponse.json({ error: 'Commande invalide.' }, { status: 400 });

  const { error } = await auth.client.rpc('complete_pin_redemption', { p_order_id: orderId, p_game_uid: uid });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ redeemStatus: 'completed' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
