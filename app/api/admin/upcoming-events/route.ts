import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const eventFields = 'id, title, category, diamond_cost, start_date, description_fr, description_ht, image_url, is_active, moderation_status, created_at';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const { data, error } = await auth.client
    .from('upcoming_events')
    .select(eventFields)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Décision de modération invalide.' }, { status: 400 });
    }
    const { eventId, moderationStatus } = body as { eventId?: unknown; moderationStatus?: unknown };
    if (typeof eventId !== 'string' || !/^[0-9a-f-]{36}$/i.test(eventId)
      || (moderationStatus !== 'approved' && moderationStatus !== 'rejected')) {
      return NextResponse.json({ error: 'Décision de modération invalide.' }, { status: 400 });
    }

    const { data, error } = await auth.client
      .from('upcoming_events')
      .update({ moderation_status: moderationStatus })
      .eq('id', eventId)
      .eq('moderation_status', 'pending')
      .select(eventFields)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Cet événement a déjà été traité ou n’existe plus. Actualise la liste.' }, { status: 409 });

    return NextResponse.json({ event: data });
  } catch {
    return NextResponse.json({ error: 'Requête de modération invalide.' }, { status: 400 });
  }
}
