import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  const [surveys, votes] = await Promise.all([
    auth.client.from('player_surveys').select('id, title, question, options, is_active, created_at').order('created_at', { ascending: false }),
    auth.client.from('survey_votes').select('survey_id, option_index'),
  ]);
  const error = surveys.error ?? votes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const counts = new Map<string, number[]>();
  for (const vote of votes.data ?? []) {
    const survey = (surveys.data ?? []).find((item) => item.id === vote.survey_id);
    if (!survey || vote.option_index >= survey.options.length) continue;
    const result = counts.get(vote.survey_id) ?? Array.from({ length: survey.options.length }, () => 0);
    result[vote.option_index] += 1;
    counts.set(vote.survey_id, result);
  }

  return NextResponse.json({
    surveys: (surveys.data ?? []).map((survey) => ({
      ...survey,
      vote_counts: counts.get(survey.id) ?? Array.from({ length: survey.options.length }, () => 0),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const title = String(body.title ?? '').trim();
    const question = String(body.question ?? '').trim();
    const options = typeof body.options === 'string'
      ? [...new Set((body.options as string).split(/\r?\n/).map((option: string) => option.trim()).filter(Boolean))]
      : [];

    if (!title || title.length > 120 || !question || question.length > 500 || options.length < 2 || options.length > 6 || options.some((option: string) => option.length > 120)) {
      return NextResponse.json({ error: 'Indique un titre, une question et entre 2 et 6 réponses (120 caractères maximum chacune).' }, { status: 400 });
    }

    const { data, error } = await auth.client
      .from('player_surveys')
      .insert({ title, question, options, is_active: true })
      .select('id, title, question, options, is_active, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ survey: { ...data, vote_counts: options.map(() => 0) } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Requête de création de sondage invalide.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const surveyId = String(body.surveyId ?? '');
    if (!uuidPattern.test(surveyId) || typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Sondage ou statut invalide.' }, { status: 400 });
    }

    const { data, error } = await auth.client
      .from('player_surveys')
      .update({ is_active: body.isActive })
      .eq('id', surveyId)
      .select('id, is_active')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 });
    return NextResponse.json({ survey: data });
  } catch {
    return NextResponse.json({ error: 'Requête de mise à jour invalide.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateRequest(request, 'admin');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const surveyId = String(body.surveyId ?? '');
    if (!uuidPattern.test(surveyId)) return NextResponse.json({ error: 'Sondage invalide.' }, { status: 400 });

    const { data, error } = await auth.client
      .from('player_surveys')
      .delete()
      .eq('id', surveyId)
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Requête de suppression invalide.' }, { status: 400 });
  }
}
