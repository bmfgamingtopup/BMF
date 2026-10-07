import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';
import { generateEventArticle } from '@/lib/ai/groq';

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getEventImagePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  try {
    const image = new URL(imageUrl);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || image.origin !== new URL(supabaseUrl).origin) return null;

    const bucketPrefix = '/storage/v1/object/public/event-media/';
    if (!image.pathname.startsWith(bucketPrefix)) return null;
    return decodeURIComponent(image.pathname.slice(bucketPrefix.length));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const { data, error } = await auth.client
    .from('ai_events')
    .select('id, title, status, date, summary, content, tags, reward, image_url')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  let uploadedPath: string | null = null;
  try {
    const formData = await request.formData();
    const instructions = String(formData.get('instructions') ?? '').trim();
    const sourceText = String(formData.get('sourceText') ?? '').trim();
    const imageValue = formData.get('image');
    const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;

    if (!instructions || instructions.length > 3000 || sourceText.length > 12000) {
      return NextResponse.json({ error: 'Ajoute des consignes (3 000 caractères maximum) et limite les informations à 12 000 caractères.' }, { status: 400 });
    }
    if (!sourceText && !image) {
      return NextResponse.json({ error: 'Ajoute des informations ou une image de référence.' }, { status: 400 });
    }
    if (image && (image.size > 4 * 1024 * 1024 || !imageExtensions[image.type])) {
      return NextResponse.json({ error: 'L’image doit être en JPG, PNG ou WebP et faire 4 Mo maximum.' }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (image) {
      uploadedPath = `events/${randomUUID()}.${imageExtensions[image.type]}`;
      const { error: uploadError } = await auth.client.storage
        .from('event-media')
        .upload(uploadedPath, Buffer.from(await image.arrayBuffer()), { contentType: image.type, upsert: false });
      if (uploadError) throw new Error(`Import de l’image impossible : ${uploadError.message}`);
      imageUrl = auth.client.storage.from('event-media').getPublicUrl(uploadedPath).data.publicUrl;
    }

    const article = await generateEventArticle({ instructions, sourceText, imageUrl });
    const { data, error } = await auth.client
      .from('ai_events')
      .insert({
        ...article,
        date: new Date().toISOString().slice(0, 10),
        reward: '',
        status: 'draft',
        image_url: imageUrl,
      })
      .select('id, title, status, date, summary, content, tags, reward, image_url')
      .single();

    if (error) throw new Error(`Enregistrement du brouillon impossible : ${error.message}`);
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await auth.client.storage.from('event-media').remove([uploadedPath]);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Génération de l’article impossible.' },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const eventId = String(body.eventId ?? '');
    const status = body.status;
    if (!eventId || !['published', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Décision de modération invalide.' }, { status: 400 });
    }

    const { data: currentEvent, error: lookupError } = await auth.client
      .from('ai_events')
      .select('status')
      .eq('id', eventId)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!currentEvent) return NextResponse.json({ error: 'Cet événement n’existe plus ou n’est pas accessible.' }, { status: 404 });
    if (!['draft', 'review'].includes(currentEvent.status)) {
      return NextResponse.json({ error: `Cet événement a déjà été traité (statut : ${currentEvent.status}). Actualise la liste.` }, { status: 409 });
    }

    const { data, error } = await auth.client
      .from('ai_events')
      .update({ status })
      .eq('id', eventId)
      .eq('status', currentEvent.status)
      .select('id, title, status, date, summary, content, tags, reward, image_url')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Aucune ligne modifiée. Vérifie la policy « Admins update ai events » et le droit UPDATE(status) dans Supabase.' }, { status: 409 });

    return NextResponse.json({ ok: true, event: data });
  } catch {
    return NextResponse.json({ error: 'Requête de modération invalide.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Article invalide.' }, { status: 400 });
    }

    const eventId = (body as { eventId?: unknown }).eventId;
    if (typeof eventId !== 'string' || !uuidPattern.test(eventId)) {
      return NextResponse.json({ error: 'Article invalide.' }, { status: 400 });
    }

    const { data: event, error: lookupError } = await auth.client
      .from('ai_events')
      .select('id, image_url')
      .eq('id', eventId)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
    if (!event) return NextResponse.json({ error: 'Cette actualité n’existe plus.' }, { status: 404 });

    const { error: deleteError } = await auth.client
      .from('ai_events')
      .delete()
      .eq('id', eventId);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });

    const imagePath = getEventImagePath(event.image_url);
    if (imagePath) {
      const { error: imageError } = await auth.client.storage.from('event-media').remove([imagePath]);
      if (imageError) {
        return NextResponse.json({ ok: true, warning: 'Actualité supprimée, mais son image n’a pas pu être effacée.' });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Requête de suppression invalide.' }, { status: 400 });
  }
}
