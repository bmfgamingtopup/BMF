import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const qrExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const { data, error } = await auth.client
    .from('payment_channels')
    .select('provider, receiver_phone, qr_path, updated_at')
    .order('provider');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const channels = await Promise.all((data ?? []).map(async (channel) => {
    if (!channel.qr_path) return { ...channel, qr_url: null };
    const { data: signedQr } = await auth.client.storage
      .from('merchant-qrs')
      .createSignedUrl(channel.qr_path, 3600);
    return { ...channel, qr_url: signedQr?.signedUrl ?? null };
  }));

  return NextResponse.json({ channels });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const formData = await request.formData();
    const provider = String(formData.get('provider') ?? '').toLowerCase();
    const receiverPhone = String(formData.get('receiverPhone') ?? '').trim();
    const removeQr = formData.get('removeQr') === 'true';
    const qrFile = formData.get('qr');

    if (!['moncash', 'natcash'].includes(provider)) {
      return NextResponse.json({ error: 'Fournisseur de paiement invalide.' }, { status: 400 });
    }
    if (qrFile && (!(qrFile instanceof File) || qrFile.size > 5 * 1024 * 1024 || !qrExtensions[qrFile.type])) {
      return NextResponse.json({ error: 'Le QR doit être une image JPG, PNG ou WebP de 5 Mo maximum.' }, { status: 400 });
    }

    const { client, user } = auth;
    const { data: current, error: currentError } = await client
      .from('payment_channels')
      .select('qr_path')
      .eq('provider', provider)
      .maybeSingle();
    if (currentError) return NextResponse.json({ error: currentError.message }, { status: 400 });

    let qrPath = removeQr ? null : current?.qr_path ?? null;
    let uploadedPath: string | null = null;
    if (qrFile instanceof File && qrFile.size > 0) {
      uploadedPath = `${provider}/${randomUUID()}.${qrExtensions[qrFile.type]}`;
      const { error: uploadError } = await client.storage
        .from('merchant-qrs')
        .upload(uploadedPath, Buffer.from(await qrFile.arrayBuffer()), {
          contentType: qrFile.type,
          upsert: false,
        });
      if (uploadError) return NextResponse.json({ error: `Import du QR impossible : ${uploadError.message}` }, { status: 400 });
      qrPath = uploadedPath;
    }

    const { data, error } = await client
      .from('payment_channels')
      .upsert({
        provider,
        receiver_phone: receiverPhone,
        qr_path: qrPath,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider' })
      .select('provider, receiver_phone, qr_path, updated_at')
      .single();

    if (error) {
      if (uploadedPath) await client.storage.from('merchant-qrs').remove([uploadedPath]);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (current?.qr_path && current.qr_path !== qrPath) {
      await client.storage.from('merchant-qrs').remove([current.qr_path]);
    }

    const { data: signedQr } = data.qr_path
      ? await client.storage.from('merchant-qrs').createSignedUrl(data.qr_path, 3600)
      : { data: null };

    return NextResponse.json({ channel: { ...data, qr_url: signedQr?.signedUrl ?? null } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne du serveur.' },
      { status: 500 },
    );
  }
}
