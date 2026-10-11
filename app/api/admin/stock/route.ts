import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const [topUps, giftCards, stock] = await Promise.all([
    auth.client.from('top_up_packs').select('*').order('sort_order'),
    auth.client.from('gift_cards').select('*').order('sort_order'),
    auth.client.from('digital_stock').select('catalog_type, product_id, status'),
  ]);

  const error = topUps.error ?? giftCards.error ?? stock.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const counts = new Map<string, { available: number; assigned: number }>();
  for (const item of stock.data ?? []) {
    const key = `${item.catalog_type}:${item.product_id}`;
    const count = counts.get(key) ?? { available: 0, assigned: 0 };
    if (item.status === 'available') count.available += 1;
    else count.assigned += 1;
    counts.set(key, count);
  }

  return NextResponse.json({
    products: [
      ...(topUps.data ?? []).map((product) => ({
        id: product.id,
        catalog_type: 'topup' as const,
        name: `${product.name} · ${product.diamonds} diamants · ${product.price}`,
        ...(counts.get(`topup:${product.id}`) ?? { available: 0, assigned: 0 }),
      })),
      ...(giftCards.data ?? []).map((product) => ({
        id: product.id,
        catalog_type: 'giftcard' as const,
        name: `${product.type} ${product.name} · ${product.value}`,
        ...(counts.get(`giftcard:${product.id}`) ?? { available: 0, assigned: 0 }),
      })),
    ],
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Données de stock invalides.' }, { status: 400 });
    }
    const input = body as { catalogType?: unknown; productId?: unknown; codes?: unknown };
    const catalogType = input.catalogType;
    const productId = input.productId;
    if ((catalogType !== 'topup' && catalogType !== 'giftcard') || typeof productId !== 'string' || !uuidPattern.test(productId) || typeof input.codes !== 'string') {
      return NextResponse.json({ error: 'Sélectionne une offre et saisis les codes à ajouter.' }, { status: 400 });
    }

    const codes = [...new Set(input.codes.split(/\r?\n/).map((code) => code.trim()).filter(Boolean))];
    if (codes.length === 0 || codes.length > 500 || codes.some((code) => code.length > 250 || /[\u0000-\u001f]/.test(code))) {
      return NextResponse.json({ error: 'Saisis entre 1 et 500 codes sur des lignes distinctes (250 caractères maximum par code).' }, { status: 400 });
    }

    const table = catalogType === 'topup' ? 'top_up_packs' : 'gift_cards';
    const { data: product, error: productError } = await auth.client
      .from(table)
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    if (productError) return NextResponse.json({ error: productError.message }, { status: 400 });
    if (!product) return NextResponse.json({ error: 'Cette offre n’existe plus dans le catalogue.' }, { status: 404 });

    const { data: inserted, error: insertError } = await auth.client
      .from('digital_stock')
      .upsert(
        codes.map((code) => ({ catalog_type: catalogType, product_id: productId, code })),
        { onConflict: 'catalog_type,product_id,code', ignoreDuplicates: true },
      )
      .select('id');
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    const { data: waitingOrders, error: ordersError } = await auth.client
      .from('orders')
      .select('id')
      .eq('order_type', catalogType)
      .eq('product_id', productId)
      .eq('status', 'paid')
      .eq('fulfillment_status', 'waiting_stock')
      .order('created_at', { ascending: true });
    if (ordersError) {
      return NextResponse.json({
        inserted: inserted?.length ?? 0,
        warning: `Codes enregistrés, mais les commandes en attente n’ont pas pu être chargées : ${ordersError.message}`,
      });
    }

    const deliveryErrors: string[] = [];
    for (const order of waitingOrders ?? []) {
      const { error } = await auth.client.rpc('confirm_order_payment', { p_order_id: order.id });
      if (error) deliveryErrors.push(`${order.id.slice(0, 8)} : ${error.message}`);
    }

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      warning: deliveryErrors.length ? `Codes enregistrés, mais certaines livraisons doivent être relancées : ${deliveryErrors.join(' ; ')}` : null,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Requête de stock invalide.' }, { status: 400 });
  }
}
