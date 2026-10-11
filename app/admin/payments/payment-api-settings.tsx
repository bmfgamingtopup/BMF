'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type Provider = 'moncash' | 'natcash';
type ApiSetting = {
  provider: Provider;
  is_enabled: boolean;
  environment: 'sandbox' | 'live';
  api_base_url: string;
  client_id: string;
  merchant_id: string;
  has_client_secret: boolean;
  has_webhook_secret: boolean;
};

const labels: Record<Provider, string> = { moncash: 'MonCash', natcash: 'NatCash' };
const blank = (provider: Provider): ApiSetting => ({
  provider,
  is_enabled: false,
  environment: 'sandbox',
  api_base_url: '',
  client_id: '',
  merchant_id: '',
  has_client_secret: false,
  has_webhook_secret: false,
});

async function authorizedFetch(init?: RequestInit) {
  const accessToken = await getAccessToken();
  return fetch('/api/admin/payment-api', {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    cache: 'no-store',
  });
}

export function PaymentApiSettings() {
  const [settings, setSettings] = useState<Record<Provider, ApiSetting>>({ moncash: blank('moncash'), natcash: blank('natcash') });
  const [saving, setSaving] = useState<Provider | null>(null);
  const [messages, setMessages] = useState<Partial<Record<Provider, { error: boolean; text: string }>>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const response = await authorizedFetch();
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Chargement impossible.');
        setSettings((current) => ({
          ...current,
          ...Object.fromEntries((data.settings ?? []).map((item: ApiSetting) => [item.provider, item])),
        }));
      } catch (error) {
        setMessages({ moncash: { error: true, text: error instanceof Error ? error.message : 'Chargement impossible.' } });
      }
    };
    void load();
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>, provider: Provider) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSaving(provider);
    setMessages((current) => ({ ...current, [provider]: undefined }));
    try {
      const response = await authorizedFetch({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          is_enabled: formData.get('is_enabled') === 'on',
          environment: formData.get('environment'),
          api_base_url: formData.get('api_base_url'),
          client_id: formData.get('client_id'),
          client_secret: formData.get('client_secret'),
          merchant_id: formData.get('merchant_id'),
          webhook_secret: formData.get('webhook_secret'),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Enregistrement impossible.');
      setSettings((current) => ({ ...current, [provider]: data.setting }));
      setMessages((current) => ({ ...current, [provider]: { error: false, text: 'Configuration API enregistrée.' } }));
      form.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((input) => { input.value = ''; });
    } catch (error) {
      setMessages((current) => ({ ...current, [provider]: { error: true, text: error instanceof Error ? error.message : 'Erreur réseau.' } }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mt-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Intégration future</p>
        <h2 className="mt-2 text-2xl font-black text-white">Clés API MonCash et NatCash</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Prépare ici les identifiants des API de paiement. Ils sont enregistrés pour un usage futur : tant que la vérification automatique n’est pas branchée, les paiements restent validés manuellement. Les secrets ne sont jamais réaffichés ; laisse un champ secret vide pour conserver la valeur actuelle.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {(['moncash', 'natcash'] as const).map((provider) => {
          const setting = settings[provider];
          const message = messages[provider];
          return (
            <section key={`${provider}-${setting.has_client_secret}-${setting.has_webhook_secret}-${setting.api_base_url}`} className="card p-5 sm:p-6">
              <h3 className="mb-5 border-b border-white/10 pb-4 text-xl font-bold text-white">{labels[provider]} · API</h3>
              <form className="space-y-4" onSubmit={(event) => void save(event, provider)}>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" name="is_enabled" defaultChecked={setting.is_enabled} className="h-4 w-4" />
                  Activer l’API {labels[provider]}
                </label>
                <label className="block text-sm text-slate-300">Environnement
                  <select name="environment" defaultValue={setting.environment} className="field">
                    <option value="sandbox">Test (sandbox)</option>
                    <option value="live">Production</option>
                  </select>
                </label>
                <label className="block text-sm text-slate-300">URL de l’API
                  <input name="api_base_url" type="url" defaultValue={setting.api_base_url} className="field" placeholder="https://…" />
                </label>
                <label className="block text-sm text-slate-300">Client ID
                  <input name="client_id" defaultValue={setting.client_id} autoComplete="off" className="field" />
                </label>
                <label className="block text-sm text-slate-300">Client secret
                  <input name="client_secret" type="password" autoComplete="new-password" className="field" placeholder={setting.has_client_secret ? '•••••••• (enregistré)' : ''} />
                </label>
                <label className="block text-sm text-slate-300">Identifiant marchand
                  <input name="merchant_id" defaultValue={setting.merchant_id} autoComplete="off" className="field" />
                </label>
                <label className="block text-sm text-slate-300">Secret du webhook
                  <input name="webhook_secret" type="password" autoComplete="new-password" className="field" placeholder={setting.has_webhook_secret ? '•••••••• (enregistré)' : ''} />
                </label>
                {message && <p role="status" className={`text-sm ${message.error ? 'text-rose-300' : 'text-emerald-300'}`}>{message.text}</p>}
                <button type="submit" disabled={saving === provider} className="primary-btn w-full disabled:opacity-50">
                  {saving === provider ? 'Enregistrement…' : `Enregistrer l’API ${labels[provider]}`}
                </button>
              </form>
            </section>
          );
        })}
      </div>
    </section>
  );
}
