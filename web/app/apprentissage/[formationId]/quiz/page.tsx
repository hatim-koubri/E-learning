"use client";

import Link from "next/link";
import {ArrowLeft, ArrowRight, Award, CheckCircle2, ClipboardCheck, Download, RotateCcw, ShieldCheck, XCircle} from "lucide-react";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, ProgressBar, Skeleton} from "@/components/ui";
import {api, apiBlob} from "@/lib/api";
import type {EvaluationPlan, QuizParticipant, QuizResult} from "@/lib/learning";

export function quizAvailabilityMessage(quiz: Pick<QuizParticipant, "tentativesRestantes" | "prochaineDisponibilite">) {
  if (quiz.tentativesRestantes > 0) {
    return `Disponible maintenant · ${quiz.tentativesRestantes} tentative(s) restante(s).`;
  }
  const retryDate = quiz.prochaineDisponibilite ? new Date(quiz.prochaineDisponibilite) : null;
  if (retryDate && !Number.isNaN(retryDate.getTime())) {
    return `Nouvelle série disponible à partir du ${retryDate.toLocaleString("fr-FR")}.`;
  }
  return "Tentatives temporairement épuisées. La prochaine disponibilité est en cours de calcul par le serveur.";
}

export default function QuizPage() {
  const formationId = Number(useParams<{formationId: string}>().formationId);
  const requestedQuizId = typeof window === "undefined" ? 0 : Number(new URLSearchParams(window.location.search).get("quiz"));
  const [items, setItems] = useState<QuizParticipant[]>([]);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [resultQuizId, setResultQuizId] = useState<number | null>(null);
  const [plan, setPlan] = useState<EvaluationPlan | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [questionByQuiz, setQuestionByQuiz] = useState<Record<number, number>>({});
  const [confirmTarget, setConfirmTarget] = useState<QuizParticipant | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [quizzes,evaluations]=await Promise.all([
        api<QuizParticipant[]>(`/participant/formations/${formationId}/quiz`),
        api<EvaluationPlan>(`/participant/formations/${formationId}/evaluations`),
      ]);
      setItems(quizzes);setPlan(evaluations);
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
      setResultQuizId(quiz.id);
      setRetrying(null);
      setSelected({});
      setQuestionByQuiz({});
      setConfirmTarget(null);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadCertificate(){
    setError("");
    try{const blob=await apiBlob(`/participant/formations/${formationId}/certificat`);const url=URL.createObjectURL(blob);
      const anchor=document.createElement("a");anchor.href=url;anchor.download=`certificat-nexalearn-${formationId}.pdf`;anchor.click();URL.revokeObjectURL(url);
    }catch(reason){setError((reason as Error).message)}
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
        {result && resultQuizId && (
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
            <div className="quiz-result-actions">
              {result.reussi ? (
                <>
                  {plan?.quizFinal?.id===resultQuizId&&plan.certificatDisponible ?
                    <Button onClick={downloadCertificate}><Download size={17}/> Télécharger mon certificat</Button>:
                    <Link className="btn btn-primary" href={`/apprentissage/${formationId}`}><ArrowRight size={17}/> Continuer le cours</Link>}
                  <Link className="btn btn-secondary" href={`/apprentissage/${formationId}`}>Retour au plan</Link>
                </>
              ) : (
                <>
                  <Button disabled={!items.find((quiz)=>quiz.id===resultQuizId)?.tentativesRestantes} onClick={()=>{setResult(null);setResultQuizId(null);setRetrying(resultQuizId)}}><RotateCcw size={17}/> Réessayer le quiz</Button>
                  <Link className="btn btn-secondary" href={`/apprentissage/${formationId}`}>Revoir le cours</Link>
                </>
              )}
            </div>
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
            {(Number.isFinite(requestedQuizId) && requestedQuizId > 0 ? items.filter((quiz) => quiz.id === requestedQuizId) : items).map((quiz) => {
              const questionIndex = Math.min(questionByQuiz[quiz.id] ?? 0, Math.max(quiz.questions.length - 1, 0));
              const question = quiz.questions[questionIndex];
              const answeredCount = quiz.questions.filter((item) => (selected[item.id]?.length ?? 0) > 0).length;
              const allAnswered = answeredCount === quiz.questions.length;
              const immediateResult=resultQuizId===quiz.id?result:null;
              const hasSavedResult=!immediateResult&&quiz.dernierResultat!=null&&retrying!==quiz.id;
              const showAttempt=!immediateResult&&!hasSavedResult;
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
                    <p className="quiz-retry-date" role="status" aria-live="polite">
                      {quizAvailabilityMessage(quiz)}
                    </p>
                  </div>
                  <span className="stat-icon"><ClipboardCheck size={21} /></span>
                </div>
                {hasSavedResult && (
                  <section className={`quiz-saved-result ${quiz.dernierResultat?"passed":"failed"}`} aria-live="polite">
                    {quiz.dernierResultat?<CheckCircle2 size={30}/>:<XCircle size={30}/>}<div>
                      <Badge variant={quiz.dernierResultat?"success":"danger"}>{quiz.dernierResultat?"Quiz validé":"Quiz non validé"}</Badge>
                      <h3>{quiz.dernierPourcentage}% obtenu</h3>
                      <p>{quiz.dernierResultat?"Bravo, cette évaluation est réussie. Vous pouvez poursuivre votre parcours.":`Le seuil requis est ${quiz.scoreMinimal} %. Revoyez les notions indiquées puis tentez à nouveau.`}</p>
                      <div className="quiz-result-actions">
                        {quiz.dernierResultat ? (plan?.quizFinal?.id===quiz.id&&plan.certificatDisponible?
                          <Button onClick={downloadCertificate}><Award size={17}/> Télécharger mon certificat</Button>:
                          <Link className="btn btn-primary" href={`/apprentissage/${formationId}`}><ArrowRight size={17}/> Continuer le cours</Link>) :
                          <Button disabled={!quiz.tentativesRestantes} onClick={()=>setRetrying(quiz.id)}><RotateCcw size={17}/> Réessayer ({quiz.tentativesRestantes})</Button>}
                        <Link className="btn btn-secondary" href={`/apprentissage/${formationId}`}>Retour au plan du cours</Link>
                      </div>
                    </div>
                  </section>
                )}
                {showAttempt && question && (
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
                {showAttempt&&<div className="form-actions quiz-navigation">
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
                </div>}
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
