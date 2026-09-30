import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function createSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('example.supabase.co')) {
    return null;
  }

  if (typeof window !== 'undefined') {
    browserClient ??= createClient(url, anonKey);
    return browserClient;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const supabase = createSupabaseClient();

export async function signInWithEmail(email: string, password: string) {
  const client = createSupabaseClient();

  if (!client) {
    return { data: null, error: new Error('Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
  }

  return client.auth.signInWithPassword({ email, password });
}

export async function signInWithOAuth(provider: 'google' | 'facebook') {
  const client = createSupabaseClient();

  if (!client) {
    return { data: null, error: new Error('Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
  }

  return client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
}

export async function requestPasswordReset(email: string) {
  const client = createSupabaseClient();

  if (!client) {
    return { data: null, error: new Error('Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
  }

  return client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login?recovery=1`,
  });
}

export async function updatePassword(password: string) {
  const client = createSupabaseClient();

  if (!client) {
    return { data: null, error: new Error('Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
  }

  return client.auth.updateUser({ password });
}

export async function signUpWithEmail(email: string, password: string, metadata: Record<string, string> = {}) {
  const client = createSupabaseClient();

  if (!client) {
    return { data: null, error: new Error('Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.') };
  }

  return client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
}

export async function getAccessToken() {
  const client = createSupabaseClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function submitTopUpOrder(payload: {
  uid: string;
  payment: string;
  paymentChannel: 'phone' | 'qr';
  productId: string;
}) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      ...payload,
      type: 'topup',
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    return { data: null, error: new Error(json.error ?? 'Impossible d’enregistrer la commande.') };
  }

  return { data: json, error: null };
}

export async function submitGiftCardOrder(payload: {
  productId: string;
  payment: string;
  paymentChannel: 'phone' | 'qr';
}) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ ...payload, type: 'giftcard' }),
  });

  const json = await response.json();

  if (!response.ok) {
    return { data: null, error: new Error(json.error ?? 'Impossible d’enregistrer la carte cadeau.') };
  }

  return { data: json, error: null };
}

export async function submitPaymentProof(orderId: string, payload: {
  transactionId: string;
  paymentPhone: string;
  proof: File;
}) {
  const accessToken = await getAccessToken();
  const formData = new FormData();
  formData.set('transactionId', payload.transactionId);
  formData.set('paymentPhone', payload.paymentPhone);
  formData.set('proof', payload.proof);

  const response = await fetch(`/api/orders/${orderId}/payment`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });
  const json = await response.json();

  if (!response.ok) {
    return { data: null, error: new Error(json.error ?? 'Impossible d’envoyer la preuve de paiement.') };
  }

  return { data: json, error: null };
}

export async function fetchAdminOrders() {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/orders', {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  const json = await response.json();

  if (!response.ok) {
    return { data: null, error: new Error(json.error ?? 'Impossible de charger les commandes.') };
  }

  return { data: json.orders ?? [], error: null };
}
