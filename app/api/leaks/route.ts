import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

type UpcomingEventPayload = {
  secret_key?: unknown;
  title?: unknown;
  category?: unknown;
  diamond_cost?: unknown;
  start_date?: unknown;
  description_fr?: unknown;
  description_ht?: unknown;
  image_url?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function matchesSecret(received: string | null, expected: string): boolean {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function readText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maximumLength ? text : null;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.MAKE_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Le webhook Make n’est pas configuré.' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (rawBody.length > 32_768) {
    return NextResponse.json({ error: 'Le payload dépasse la taille autorisée.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Le JSON envoyé est invalide.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Le payload doit être un objet JSON.' }, { status: 400 });
  }

  const payload = body as UpcomingEventPayload;
  const headerSecret = request.headers.get('x-make-webhook-secret')
    ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? null;
  const bodySecret = typeof payload.secret_key === 'string' ? payload.secret_key : null;
  if (!matchesSecret(headerSecret, expectedSecret) && !matchesSecret(bodySecret, expectedSecret)) {
    return NextResponse.json({ error: 'Authentification du webhook invalide.' }, { status: 401 });
  }

  const title = readText(payload.title, 160);
  const category = readText(payload.category, 80);
  const diamondCost = readText(payload.diamond_cost, 80);
  const startDate = readText(payload.start_date, 10);
  const descriptionFr = readText(payload.description_fr, 8_000);
  const descriptionHt = readText(payload.description_ht, 8_000);
  const imageUrl = readText(payload.image_url, 2_048);

  if (!title || !category || !diamondCost || !startDate || !descriptionFr || !descriptionHt || !imageUrl) {
    return NextResponse.json({ error: 'Un ou plusieurs champs requis sont absents ou dépassent la longueur autorisée.' }, { status: 400 });
  }
  if (!hasValidDate(startDate)) {
    return NextResponse.json({ error: 'start_date doit être une date réelle au format YYYY-MM-DD.' }, { status: 400 });
  }

  let parsedImageUrl: URL;
  try {
    parsedImageUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'image_url doit être une URL HTTPS valide.' }, { status: 400 });
  }
  if (parsedImageUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'image_url doit être une URL HTTPS valide.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'La connexion serveur à Supabase n’est pas configurée.' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.from('upcoming_events').insert({
    title,
    category,
    diamond_cost: diamondCost,
    start_date: startDate,
    description_fr: descriptionFr,
    description_ht: descriptionHt,
    image_url: parsedImageUrl.toString(),
    moderation_status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: 'Impossible d’enregistrer l’événement.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
