import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'customer');
  if (auth.response) return auth.response;

  const { data: orders, error } = await auth.client
    .from('orders')
    .select('id, reference, pack_name, amount, status, order_type, fulfillment_status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const deliveredOrderIds = (orders ?? [])
    .filter((order) => order.fulfillment_status === 'delivered')
    .map((order) => order.id);
  const { data: assignedCodes, error: codeError } = deliveredOrderIds.length
    ? await auth.client
      .from('digital_stock')
      .select('order_id, code')
      .in('order_id', deliveredOrderIds)
    : { data: [], error: null };

  if (codeError) return NextResponse.json({ error: codeError.message }, { status: 400 });

  const codeByOrder = new Map((assignedCodes ?? []).map((item) => [item.order_id, item.code]));
  return NextResponse.json({
    orders: (orders ?? []).map((order) => ({
      ...order,
      delivery_code: order.fulfillment_status === 'delivered' ? codeByOrder.get(order.id) ?? null : null,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
