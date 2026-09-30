import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;

  const { data: profile, error } = await auth.client
    .from('profiles')
    .select('role')
    .eq('id', auth.user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profil utilisateur indisponible.' }, { status: 403 });
  }

  return NextResponse.json(
    { role: profile.role },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}