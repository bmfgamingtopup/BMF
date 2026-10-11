import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const secretFields = ['client_secret', 'webhook_secret'] as const;
const textFields = ['api_base_url', 'client_id', 'merchant_id'] as const;

function toPublic(row: Record<string, unknown>) {
  return {
    provider: row.provider,
    is_enabled: row.is_enabled,
    environment: row.environment,
    api_base_url: row.api_base_url,
    client_id: row.client_id,
    merchant_id: row.merchant_id,
    has_client_secret: Boolean(row.client_secret),
    has_webhook_secret: Boolean(row.webhook_secret),
  };
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const { data, error } = await auth.client.from('payment_api_settings').select('*').order('provider');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: (data ?? []).map(toPublic) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const provider = typeof body?.provider === 'string' ? body.provider : '';
  if (!body || !['moncash', 'natcash'].includes(provider)) {
    return NextResponse.json({ error: 'Fournisseur de paiement invalide.' }, { status: 400 });
  }
  if (!['sandbox', 'live'].includes(String(body.environment))) {
    return NextResponse.json({ error: 'Environnement invalide.' }, { status: 400 });
  }

  const baseUrl = typeof body.api_base_url === 'string' ? body.api_base_url.trim() : '';
  if (baseUrl && !/^https:\/\/[^\s]+$/i.test(baseUrl)) {
    return NextResponse.json({ error: 'L’URL de l’API doit commencer par https://.' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    provider,
    is_enabled: body.is_enabled === true,
    environment: body.environment,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };
  for (const field of textFields) {
    const value = body[field];
    if (typeof value === 'string') update[field] = value.trim().slice(0, 500);
  }
  // Un secret vide conserve la valeur déjà enregistrée.
  for (const field of secretFields) {
    const value = body[field];
    if (typeof value === 'string' && value.trim()) update[field] = value.trim().slice(0, 1000);
  }

  const { data, error } = await auth.client
    .from('payment_api_settings')
    .upsert(update, { onConflict: 'provider' })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ setting: toPublic(data) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
