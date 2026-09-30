import { createSupabaseClient } from '@/lib/supabase/client';
import { normalizeCurrencyLabel } from '@/lib/currency';

export type RevenueStat = {
  label: string;
  value: string;
};

export type TopUpPack = {
  id: string;
  tag: string;
  name: string;
  diamonds: string;
  price: string;
};

export type GiftCard = {
  id: string;
  type: string;
  name: string;
  value: string;
};

export type AiEvent = {
  id?: string;
  title: string;
  status: 'draft' | 'review' | 'published' | 'rejected';
  date: string;
  summary: string;
  content: string;
  tags: string[];
  image_url: string | null;
  reward: string;
};

export type OrderHistoryItem = {
  id: string;
  customer: string;
  amount: string;
  status: 'En attente' | 'Validée' | 'Livrée';
  date: string;
};

export type AdminOrder = {
  id: string;
  customer: string;
  amount: string;
  method: string;
  status: 'À valider' | 'Payé';
};

export type CatalogData = {
  revenueStats: RevenueStat[];
  topUpPacks: TopUpPack[];
  giftCards: GiftCard[];
  aiEvents: AiEvent[];
};

export const revenueStats: RevenueStat[] = [];
export const topUpPacks: TopUpPack[] = [];
export const giftCards: GiftCard[] = [];
export const aiEvents: AiEvent[] = [];
export const orderHistory: OrderHistoryItem[] = [];
export const adminOrders: AdminOrder[] = [];

export async function fetchCatalogData(): Promise<CatalogData> {
  const client = createSupabaseClient();

  if (!client) {
    return {
      revenueStats: [],
      topUpPacks: [],
      giftCards: [],
      aiEvents: [],
    };
  }

  const [revenueResult, topUpResult, giftCardsResult, aiEventsResult] = await Promise.all([
    client.from('revenue_stats').select('*').order('sort_order', { ascending: true }),
    client.from('top_up_packs').select('*').order('sort_order', { ascending: true }),
    client.from('gift_cards').select('*').order('sort_order', { ascending: true }),
    client.from('ai_events').select('*').eq('status', 'published').order('created_at', { ascending: false }),
  ]);

  if (revenueResult.error) console.warn('Supabase revenue_stats error:', revenueResult.error.message);
  if (topUpResult.error) console.warn('Supabase top_up_packs error:', topUpResult.error.message);
  if (giftCardsResult.error) console.warn('Supabase gift_cards error:', giftCardsResult.error.message);
  if (aiEventsResult.error) console.warn('Supabase ai_events error:', aiEventsResult.error.message);

  return {
    revenueStats: (revenueResult.data ?? [])
      .filter((item) => item.label && item.value)
      .map((item) => ({ label: String(item.label), value: String(item.value) })),
    topUpPacks: (topUpResult.data ?? [])
      .filter((item) => item.id && item.name && item.diamonds && item.price)
      .map((item) => ({
        id: String(item.id),
        tag: String(item.tag),
        name: String(item.name),
        diamonds: String(item.diamonds),
        price: normalizeCurrencyLabel(String(item.price)),
      })),
    giftCards: (giftCardsResult.data ?? [])
      .filter((item) => item.id && item.type && item.name && item.value)
      .map((item) => ({
        id: String(item.id),
        type: String(item.type),
        name: String(item.name),
        value: normalizeCurrencyLabel(String(item.value)),
      })),
    aiEvents: (aiEventsResult.data ?? [])
      .filter((item) => item.title && item.date && item.status === 'published')
      .map((item) => ({
        title: String(item.title),
        status: item.status as AiEvent['status'],
        date: String(item.date),
        summary: String(item.summary),
        content: String(item.content ?? ''),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        image_url: typeof item.image_url === 'string' ? item.image_url : null,
        reward: normalizeCurrencyLabel(String(item.reward)),
      })),
  };
}
