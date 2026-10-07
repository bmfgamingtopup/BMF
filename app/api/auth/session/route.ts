import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth.response) return auth.response;

  const { data: profile, error } = await auth.client
    .from('profiles')
    .select('role, first_name, last_name, free_fire_id')
    .eq('id', auth.user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profil utilisateur indisponible.' }, { status: 403 });
  }

  return NextResponse.json(
    {
      role: profile.role,
      firstName: profile.first_name,
      lastName: profile.last_name,
      freeFireId: profile.free_fire_id,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}