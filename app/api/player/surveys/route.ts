import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/supabase/request';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await authenticateRequest(request, 'customer');
  if (auth.response) return auth.response;

  const [surveys, votes] = await Promise.all([
    auth.client.from('player_surveys').select('id, title, question, options').eq('is_active', true).order('created_at', { ascending: false }),
    auth.client.from('survey_votes').select('survey_id, option_index').eq('user_id', auth.user.id),
  ]);
  const error = surveys.error ?? votes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const userVotes = new Map((votes.data ?? []).map((vote) => [vote.survey_id, vote.option_index]));
  return NextResponse.json({
    surveys: (surveys.data ?? []).map((survey) => ({
      ...survey,
      votedOptionIndex: userVotes.get(survey.id) ?? null,
    })),
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request, 'customer');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const surveyId = String(body.surveyId ?? '');
    const optionIndex = body.optionIndex;
    if (!uuidPattern.test(surveyId) || !Number.isInteger(optionIndex) || optionIndex < 0) {
      return NextResponse.json({ error: 'Choix de réponse invalide.' }, { status: 400 });
    }

    const { data: survey, error: surveyError } = await auth.client
      .from('player_surveys')
      .select('id, options')
      .eq('id', surveyId)
      .eq('is_active', true)
      .maybeSingle();
    if (surveyError) return NextResponse.json({ error: surveyError.message }, { status: 400 });
    if (!survey || optionIndex >= survey.options.length) {
      return NextResponse.json({ error: 'Ce sondage n’est plus actif ou la réponse est invalide.' }, { status: 404 });
    }

    const { error } = await auth.client
      .from('survey_votes')
      .insert({ survey_id: surveyId, user_id: auth.user.id, option_index: optionIndex });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Tu as déjà répondu à ce sondage.' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, optionIndex });
  } catch {
    return NextResponse.json({ error: 'Requête de vote invalide.' }, { status: 400 });
  }
}
