"use client";

import Link from "next/link";
import {ArrowLeft, CheckCircle2, ClipboardCheck, ShieldCheck} from "lucide-react";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {QuizParticipant} from "@/lib/learning";

export default function QuizPage() {
  const formationId = Number(useParams<{formationId: string}>().formationId);
  const [items, setItems] = useState<QuizParticipant[]>([]);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

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
      const response = await api<{pourcentage: number; reussi: boolean}>(`/participant/quiz/${quiz.id}/tentatives`, {
        method: "POST",
        body: JSON.stringify({
          reponses: Object.fromEntries(quiz.questions.map((question) => [question.id, selected[question.id] ?? []])),
        }),
      });
      setResult(`Résultat : ${response.pourcentage}% — ${response.reussi ? "réussi" : "non réussi"}`);
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
          actions={<Link className="btn btn-secondary" href={`/catalogue/${formationId}`}><ArrowLeft size={17} /> Retour au cours</Link>}
        />
        <Alert>
          <ShieldCheck size={18} />
          Les quiz ne sont pas disponibles hors ligne. Une tentative envoyée ne peut pas être annulée.
        </Alert>
        {error && <ErrorState message={error} onRetry={load} />}
        {result && <Alert variant="success">{result}</Alert>}
        {loading ? (
          <Card style={{marginTop: 20}}><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></Card>
        ) : !error && items.length === 0 ? (
          <div style={{marginTop: 20}}>
            <EmptyState
              title="Aucun QCM disponible"
              description="Les évaluations publiées apparaîtront ici lorsque les prérequis du cours seront remplis."
            />
          </div>
        ) : (
          <div className="module-list" style={{marginTop: 20}}>
            {items.map((quiz) => (
              <Card key={quiz.id}>
                <div className="panel-heading">
                  <div>
                    <div className="row">
                      <Badge variant={quiz.important ? "warning" : "primary"}>{quiz.important ? "Important" : "QCM"}</Badge>
                      <Badge>{quiz.tentativesRestantes} tentative(s)</Badge>
                    </div>
                    <h2 style={{marginTop: 12}}>{quiz.titre}</h2>
                    <p>Seuil de réussite : {quiz.scoreMinimal}%</p>
                  </div>
                  <span className="stat-icon"><ClipboardCheck size={21} /></span>
                </div>
                {quiz.questions.map((question, questionIndex) => (
                  <fieldset className="quiz-question" key={question.id}>
                    <legend>Question {questionIndex + 1} · {question.points} pt</legend>
                    <strong>{question.libelle}</strong>
                    {question.reponses.map((answer) => (
                      <label className="answer" key={answer.id}>
                        <input
                          type="checkbox"
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
                ))}
                <div className="form-actions">
                  <Button
                    disabled={!quiz.tentativesRestantes}
                    loading={busy === quiz.id}
                    onClick={() => submit(quiz)}
                  >
                    {!busy && <CheckCircle2 size={17} />} Soumettre et corriger
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AppShell>
    </Protected>
  );
}
