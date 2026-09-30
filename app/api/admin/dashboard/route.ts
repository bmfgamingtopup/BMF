import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const { data, error } = await auth.client.rpc('get_admin_dashboard_stats');
  if (error) {
    return NextResponse.json({ error: 'Statistiques indisponibles. Exécutez le schéma Supabase à jour.' }, { status: 503 });
  }

  return NextResponse.json({ stats: data });
}
