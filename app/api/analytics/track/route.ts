import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/client';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost ?? request.headers.get('host') ?? new URL(request.url).host;
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  const isLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
    || hostname.endsWith('.localhost');
  if (process.env.NODE_ENV !== 'production' || isLocalHost) {
    return new NextResponse(null, { status: 204 });
  }

  const client = createSupabaseClient();
  if (!client) return NextResponse.json({ error: 'Analytics non configurées.' }, { status: 503 });

  try {
    const body = await request.json();
    const visitorId = String(body.visitorId ?? '');
    const path = String(body.path ?? '/');
    if (!uuidPattern.test(visitorId) || !path.startsWith('/') || path.length > 200) {
      return NextResponse.json({ error: 'Événement analytics invalide.' }, { status: 400 });
    }

    const { error } = await client.rpc('track_site_visit', {
      visitor_id_input: visitorId,
      path_input: path,
    });
    if (error) return NextResponse.json({ error: 'Enregistrement analytics impossible.' }, { status: 503 });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Événement analytics invalide.' }, { status: 400 });
  }
}
