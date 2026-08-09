"use client";

import Link from "next/link";
import {ArrowLeft, CheckCircle2, ClipboardCheck, ShieldCheck, XCircle} from "lucide-react";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, ProgressBar, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {QuizParticipant, QuizResult} from "@/lib/learning";

export default function QuizPage() {
  const formationId = Number(useParams<{formationId: string}>().formationId);
  const [items, setItems] = useState<QuizParticipant[]>([]);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [questionByQuiz, setQuestionByQuiz] = useState<Record<number, number>>({});
  const [confirmTarget, setConfirmTarget] = useState<QuizParticipant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<QuizParticipant[]>(`/participant/formations/${formationId}/quiz`));
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, [formationId]);

  useEffect(() => {
    // The request deliberately owns the loading state for the initial page load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function submit(quiz: QuizParticipant) {
    setBusy(quiz.id);
    setError("");
    try {
      const response = await api<QuizResult>(`/participant/quiz/${quiz.id}/tentatives`, {
        method: "POST",
        body: JSON.stringify({
          reponses: Object.fromEntries(quiz.questions.map((question) => [question.id, selected[question.id] ?? []])),
        }),
      });
      setResult(response);
      setConfirmTarget(null);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Protected role="PARTICIPANT">
      <AppShell role="PARTICIPANT">
        <PageHeader
          eyebrow="Évaluations"
          title="Évaluations en ligne"
          description="Répondez avec attention : la correction et le score sont calculés uniquement par le serveur."
          breadcrumb={[
            {label: "Tableau de bord", href: "/profile"},
            {label: "Formation", href: `/catalogue/${formationId}`},
            {label: "QCM"},
          ]}
          actions={<Link className="btn btn-secondary" href={`/apprentissage/${formationId}`}><ArrowLeft size={17} /> Retour au cours</Link>}
        />
        <Alert>
          <ShieldCheck size={18} />
          Les quiz ne sont pas disponibles hors ligne. Une tentative envoyée ne peut pas être annulée.
        </Alert>
        {error && <ErrorState message={error} onRetry={load} />}
        {result && (
          <Card className="quiz-feedback" aria-live="polite">
            <Alert className="quiz-score" variant={result.reussi ? "success" : "error"}>
              Résultat : {result.pourcentage}% — {result.reussi ? "réussi" : "à consolider"}
            </Alert>
            <h2>Retour question par question</h2>
            <ul>
              {(result.feedback ?? []).map((item, index) => (
                <li className={item.correcte ? "correct" : "incorrect"} key={item.questionId}>
                  {item.correcte ? <CheckCircle2 aria-hidden="true" size={17} /> : <XCircle aria-hidden="true" size={17} />}
                  <div>
                    <strong>Question {index + 1} : {item.correcte ? "correcte" : "incorrecte"}</strong>
                    {item.explication && <p>{item.explication}</p>}
                  </div>
                </li>
              ))}
            </ul>
            {(result.chapitresARevoir ?? []).length > 0 && (
              <div className="review-chapters">
                <h3>Chapitres à revoir</h3>
                {(result.chapitresARevoir ?? []).map((chapter) => (
                  <Link className="btn btn-secondary" href={`/apprentissage/${formationId}?chapitre=${chapter.chapitreId}`} key={chapter.chapitreId}>
                    Reprendre {chapter.titre}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
        {loading ? (
          <Card className="quiz-page-content"><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></Card>
        ) : !error && items.length === 0 ? (
          <div className="quiz-page-content">
            <EmptyState
              title="Aucun QCM disponible"
              description="Les évaluations publiées apparaîtront ici lorsque les prérequis du cours seront remplis."
            />
          </div>
        ) : (
          <div className="module-list quiz-page-content">
            {items.map((quiz) => {
              const questionIndex = Math.min(questionByQuiz[quiz.id] ?? 0, Math.max(quiz.questions.length - 1, 0));
              const question = quiz.questions[questionIndex];
              const answeredCount = quiz.questions.filter((item) => (selected[item.id]?.length ?? 0) > 0).length;
              const allAnswered = answeredCount === quiz.questions.length;
              const retryDate = quiz.prochaineDisponibilite ? new Date(quiz.prochaineDisponibilite) : null;
              return (
              <Card className="quiz-attempt" key={quiz.id}>
                <div className="panel-heading">
                  <div>
                    <div className="row">
                      <Badge variant={quiz.important ? "warning" : "primary"}>{quiz.important ? "Important" : "QCM"}</Badge>
                      <Badge>{quiz.tentativesRestantes} tentative(s)</Badge>
                    </div>
                    <h2 className="quiz-title">{quiz.titre}</h2>
                    <p>Seuil de réussite : {quiz.scoreMinimal}%</p>
                    {quiz.tentativesRestantes === 0 && retryDate && !Number.isNaN(retryDate.getTime()) && (
                      <p className="quiz-retry-date">Nouvelle tentative à partir du {retryDate.toLocaleString("fr-FR")}</p>
                    )}
                  </div>
                  <span className="stat-icon"><ClipboardCheck size={21} /></span>
                </div>
                {question && (
                  <>
                    <div className="quiz-progress-summary">
                      <span>Question {questionIndex + 1} sur {quiz.questions.length}</span>
                      <span>{answeredCount} réponse(s) enregistrée(s) dans ce formulaire</span>
                    </div>
                    <ProgressBar
                      value={quiz.questions.length ? ((questionIndex + 1) / quiz.questions.length) * 100 : 0}
                      label={`Progression du QCM : question ${questionIndex + 1} sur ${quiz.questions.length}`}
                    />
                  <fieldset className="quiz-question" key={question.id}>
                    <legend>Question {questionIndex + 1} · {question.points} pt</legend>
                    <strong>{question.libelle}</strong>
                    {question.reponses.map((answer) => (
                      <label className="answer" key={answer.id}>
                        <input
                          type="checkbox"
                          checked={(selected[question.id] ?? []).includes(answer.id)}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [question.id]: event.target.checked
                                ? [...(current[question.id] ?? []), answer.id]
                                : (current[question.id] ?? []).filter((id) => id !== answer.id),
                            }))
                          }
                        />
                        {answer.libelle}
                      </label>
                    ))}
                  </fieldset>
                  </>
                )}
                <div className="form-actions quiz-navigation">
                  <Button
                    variant="secondary"
                    disabled={questionIndex === 0}
                    onClick={() => setQuestionByQuiz((current) => ({...current, [quiz.id]: questionIndex - 1}))}
                  >
                    Question précédente
                  </Button>
                  {questionIndex < quiz.questions.length - 1 ? (
                    <Button
                      disabled={(selected[question?.id ?? -1]?.length ?? 0) === 0}
                      onClick={() => setQuestionByQuiz((current) => ({...current, [quiz.id]: questionIndex + 1}))}
                    >
                      Question suivante
                    </Button>
                  ) : (
                  <Button
                    disabled={!quiz.tentativesRestantes || !allAnswered}
                    loading={busy === quiz.id}
                    onClick={() => setConfirmTarget(quiz)}
                  >
                    {!busy && <CheckCircle2 size={17} />} Vérifier mes réponses
                  </Button>
                  )}
                </div>
              </Card>
              );
            })}
          </div>
        )}
        <ConfirmDialog
          open={Boolean(confirmTarget)}
          title="Envoyer cette tentative ?"
          description={confirmTarget ? `${confirmTarget.questions.filter((question) => (selected[question.id]?.length ?? 0) > 0).length} réponse(s) sur ${confirmTarget.questions.length} seront corrigées par le serveur. Cet envoi ne peut pas être annulé.` : ""}
          confirmLabel="Soumettre et corriger"
          busy={busy === confirmTarget?.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => confirmTarget ? submit(confirmTarget) : undefined}
        />
      </AppShell>
    </Protected>
  );
}
