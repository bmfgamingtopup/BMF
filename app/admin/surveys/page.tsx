'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getAccessToken } from '@/lib/supabase/client';

type Survey = {
  id: string;
  title: string;
  question: string;
  options: string[];
  is_active: boolean;
  vote_counts: number[];
  created_at: string;
};

async function mutateSurvey(method: 'POST' | 'PATCH' | 'DELETE', body: Record<string, unknown>) {
  const accessToken = await getAccessToken();
  const response = await fetch('/api/admin/surveys', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Opération sur le sondage impossible.');
  return data;
}

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadSurveys = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/surveys', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Chargement des sondages impossible.');
      setSurveys(data.surveys ?? []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Chargement des sondages impossible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for the authenticated API response before updating the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSurveys();
  }, []);

  const createSurvey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const data = await mutateSurvey('POST', {
        title: values.get('title'),
        question: values.get('question'),
        options: values.get('options'),
      });
      setSurveys((current) => [data.survey, ...current]);
      setInfoMessage('Sondage créé et publié dans l’espace joueur.');
      form.reset();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Création du sondage impossible.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSurvey = async (survey: Survey) => {
    setSaving(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await mutateSurvey('PATCH', { surveyId: survey.id, isActive: !survey.is_active });
      await loadSurveys();
      setInfoMessage(survey.is_active ? 'Sondage fermé.' : 'Sondage ouvert aux joueurs.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Mise à jour du sondage impossible.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSurvey = async (survey: Survey) => {
    if (!window.confirm(`Supprimer le sondage « ${survey.title} » et ses réponses ?`)) return;
    setSaving(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      await mutateSurvey('DELETE', { surveyId: survey.id });
      setSurveys((current) => current.filter((item) => item.id !== survey.id));
      setInfoMessage('Sondage supprimé.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Suppression du sondage impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-7">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Participation des joueurs</p>
        <h1 className="mt-2 text-3xl font-black text-white">Sondages</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Crée une question et ses choix de réponse. Les joueurs connectés peuvent répondre une seule fois à chaque sondage actif.</p>
      </header>

      {errorMessage && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</p>}
      {infoMessage && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{infoMessage}</p>}

      <section className="card max-w-3xl p-5 sm:p-7">
        <h2 className="text-lg font-bold text-white">Créer un sondage</h2>
        <form className="mt-5 space-y-4" onSubmit={(event) => void createSurvey(event)}>
          <label className="block text-sm text-slate-300">Titre
            <input className="field" name="title" required maxLength={120} placeholder="Ex. Prochaine nouveauté BMF" />
          </label>
          <label className="block text-sm text-slate-300">Question
            <textarea className="field min-h-24 resize-y" name="question" required maxLength={500} placeholder="Quelle nouveauté aimerais-tu voir ensuite ?" />
          </label>
          <label className="block text-sm text-slate-300">Réponses (une par ligne, 2 à 6)
            <textarea className="field min-h-28 resize-y" name="options" required maxLength={800} placeholder={'Nouveaux diamants Free Fire\nCartes cadeaux\nTournois communautaires'} />
          </label>
          <button type="submit" disabled={saving} className="primary-btn w-full disabled:opacity-50">
            {saving ? 'Enregistrement…' : 'Créer le sondage'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Sondages créés</h2>
        {loading ? <div className="card p-6 text-slate-400">Chargement des sondages…</div> : surveys.length ? (
          <div className="space-y-4">
            {surveys.map((survey) => {
              const totalVotes = survey.vote_counts.reduce((sum, count) => sum + count, 0);
              return (
                <article key={survey.id} className="card p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{survey.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${survey.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-500/10 text-slate-400'}`}>
                          {survey.is_active ? 'Actif' : 'Fermé'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{survey.question}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={saving} onClick={() => void toggleSurvey(survey)} className="secondary-btn px-3 py-2 text-xs disabled:opacity-50">
                        {survey.is_active ? 'Fermer' : 'Réactiver'}
                      </button>
                      <button type="button" disabled={saving} onClick={() => void deleteSurvey(survey)} className="rounded-xl border border-rose-400/20 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {survey.options.map((option, index) => {
                      const count = survey.vote_counts[index] ?? 0;
                      const percentage = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                      return (
                        <div key={`${survey.id}-${option}`} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                          <div className="flex justify-between gap-3 text-xs">
                            <span className="text-slate-200">{option}</span>
                            <span className="shrink-0 text-slate-400">{count} · {percentage}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{totalVotes} réponse(s)</p>
                </article>
              );
            })}
          </div>
        ) : <div className="card p-6 text-sm text-slate-400">Aucun sondage. Crée ta première question ci-dessus.</div>}
      </section>
    </main>
  );
}
