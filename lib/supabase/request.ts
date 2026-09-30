import { createClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function authenticateRequest(request: Request, requiredRole?: 'admin' | 'customer') {
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !url || !anonKey) {
    return { response: NextResponse.json({ error: 'Connexion requise.' }, { status: 401 }) };
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { response: NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 401 }) };
  }

  if (requiredRole) {
    const { data: profile, error } = await client
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();

    if (error || profile?.role !== requiredRole) {
      const errorMessage = requiredRole === 'admin'
        ? 'Accès réservé aux administrateurs.'
        : 'Accès réservé aux comptes clients.';
      return { response: NextResponse.json({ error: errorMessage }, { status: 403 }) };
    }
  }

  return { client, user: userData.user as User };
}
