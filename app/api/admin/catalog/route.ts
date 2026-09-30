import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';
import { formatHtgAmount } from '@/lib/currency';

type Catalog = 'topup' | 'giftcard';

const tableFor = (catalog: Catalog) => catalog === 'topup' ? 'top_up_packs' : 'gift_cards';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type NormalizedProduct = { data: Record<string, string> } | { error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function normalizeProduct(catalog: Catalog, product: Record<string, unknown>): NormalizedProduct {
  const name = String(product.name ?? '').trim();
  const amount = Number(String(catalog === 'topup' ? product.price : product.value ?? '')
    .replace(/[\s,]/g, ''));
  if (!name || name.length > 120) return { error: 'Le nom du produit est obligatoire (120 caractères maximum).' };
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100_000_000) {
    return { error: 'Le prix doit être un montant entier positif en gourdes (HTG).' };
  }

  const formattedAmount = formatHtgAmount(amount);
  if (catalog === 'topup') {
    const tag = String(product.tag ?? '').trim();
    const diamonds = Number(String(product.diamonds ?? '').replace(/[\s,]/g, ''));
    if (!tag || tag.length > 40) return { error: 'Le tag est obligatoire (40 caractères maximum).' };
    if (!Number.isSafeInteger(diamonds) || diamonds < 1 || diamonds > 100_000_000) {
      return { error: 'Le nombre de diamants doit être un entier positif.' };
    }
    return { data: { tag, name, diamonds: String(diamonds), price: formattedAmount } };
  }

  const type = String(product.type ?? '').trim();
  if (!type || type.length > 60) return { error: 'Le type de carte est obligatoire (60 caractères maximum).' };
  return { data: { type, name, value: formattedAmount } };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const [topUps, giftCards] = await Promise.all([
    auth.client.from('top_up_packs').select('id, tag, name, diamonds, price, sort_order').order('sort_order'),
    auth.client.from('gift_cards').select('id, type, name, value, sort_order').order('sort_order'),
  ]);

  if (topUps.error || giftCards.error) {
    return NextResponse.json({ error: topUps.error?.message ?? giftCards.error?.message }, { status: 400 });
  }
  return NextResponse.json({ topUpPacks: topUps.data ?? [], giftCards: giftCards.data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = asRecord(await request.json());
    const catalog = body?.catalog;
    const product = asRecord(body?.product);
    if ((catalog !== 'topup' && catalog !== 'giftcard') || !product) {
      return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 });
    }

    const normalized = normalizeProduct(catalog, product);
    if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const table = tableFor(catalog);
    const { data: lastProduct, error: orderError } = await auth.client
      .from(table)
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });

    const { data, error } = await auth.client
      .from(table)
      .insert({ ...normalized.data, sort_order: (lastProduct?.sort_order ?? -1) + 1 })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ product: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Requête de création invalide.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = asRecord(await request.json());
    const catalog = body?.catalog;
    const product = asRecord(body?.product);
    const id = String(body?.id ?? '');
    if ((catalog !== 'topup' && catalog !== 'giftcard') || !product || !uuidPattern.test(id)) {
      return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 });
    }

    const normalized = normalizeProduct(catalog, product);
    if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const { data, error } = await auth.client
      .from(tableFor(catalog))
      .update(normalized.data)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });

    return NextResponse.json({ product: data });
  } catch {
    return NextResponse.json({ error: 'Requête de mise à jour invalide.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = asRecord(await request.json());
    const catalog = body?.catalog;
    const id = String(body?.id ?? '');
    if ((catalog !== 'topup' && catalog !== 'giftcard') || !uuidPattern.test(id)) {
      return NextResponse.json({ error: 'Produit invalide.' }, { status: 400 });
    }

    const { data, error } = await auth.client
      .from(tableFor(catalog))
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (!data) return NextResponse.json({ error: 'Produit introuvable.' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Requête de suppression invalide.' }, { status: 400 });
  }
}