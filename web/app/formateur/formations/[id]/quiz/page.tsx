"use client";

import Link from "next/link";
import {ArrowLeft, ClipboardCheck, Plus, Trash2} from "lucide-react";
import {useParams} from "next/navigation";
import {FormEvent, useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";

type Quiz = {
  id: number;
  titre: string;
  scoreMinimal: number;
  important: boolean;
  publie: boolean;
  questions: {id: number; libelle: string; explication?: string; points: number; reponses: {id: number; libelle: string; correcte: boolean}[]}[];
};
type DraftQuestion = {id?: number; libelle: string; explication: string; points: number; reponses: {id?: number; libelle: string; correcte: boolean}[]};
const blank = (): DraftQuestion => ({
  libelle: "",
  explication: "",
  points: 1,
  reponses: [{libelle: "", correcte: true}, {libelle: "", correcte: false}],
});

export default function QuizEditor() {
  const formationId = Number(useParams<{id: string}>().id);
  const [items, setItems] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blank()]);
  const [title, setTitle] = useState("");
  const [scoreMinimal, setScoreMinimal] = useState(70);
  const [important, setImportant] = useState(false);
  const [published, setPublished] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Quiz | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<Quiz[]>(`/formateur/formations/${formationId}/quiz`));
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

  function patchQuestion(index: number, value: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((item, itemIndex) => itemIndex === index ? {...item, ...value} : item));
  }

  function resetEditor() {
    setEditing(null);
    setTitle("");
    setScoreMinimal(70);
    setImportant(false);
    setPublished(false);
    setQuestions([blank()]);
  }

  function beginEdit(quiz: Quiz) {
    setEditing(quiz);
    setTitle(quiz.titre);
    setScoreMinimal(quiz.scoreMinimal);
    setImportant(quiz.important);
    setPublished(quiz.publie);
    setQuestions(quiz.questions.map((question) => ({
      id: question.id,
      libelle: question.libelle,
      explication: question.explication ?? "",
      points: question.points,
      reponses: question.reponses.map((answer) => ({id: answer.id, libelle: answer.libelle, correcte: answer.correcte})),
    })));
    document.querySelector<HTMLElement>(".quiz-editor-form")?.scrollIntoView?.({behavior: "smooth", block: "start"});
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      titre: title,
      scoreMinimal,
      important,
      publie: published,
      questions: questions.map((question, questionIndex) => ({
        ...question,
        ordre: questionIndex,
        reponses: question.reponses.map((answer, answerIndex) => ({...answer, ordre: answerIndex})),
      })),
    };
    try {
      await api(editing ? `/formateur/quiz/${editing.id}` : `/formateur/formations/${formationId}/quiz`, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(editing ? "Le QCM a été mis à jour." : "Le QCM a été créé.");
      resetEditor();
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api(`/formateur/quiz/${deleting.id}`, {method: "DELETE"});
      setDeleting(null);
      setNotice("Le QCM a été supprimé.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader
          eyebrow="Éditeur pédagogique"
          title="QCM de la formation"
          description="Créez des évaluations claires, choisissez le seuil de réussite et contrôlez leur publication."
          breadcrumb={[
            {label: "Formations", href: "/formateur/formations"},
            {label: "Éditeur", href: `/formateur/formations/${formationId}`},
            {label: "QCM"},
          ]}
          actions={<Link className="btn btn-secondary" href={`/formateur/formations/${formationId}`}><ArrowLeft size={17} /> Formation</Link>}
        />
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}
        <div className="dashboard-grid">
          <Card>
            <div className="panel-heading">
              <div><h2>{editing ? "Modifier le QCM" : "Nouveau QCM"}</h2><p>Ajoutez au moins deux réponses par question et vérifiez les réponses correctes.</p></div>
              <span className="stat-icon"><ClipboardCheck size={21} /></span>
            </div>
            <form className="stack quiz-editor-form" onSubmit={save}>
              <label>Titre du quiz<input name="titre" placeholder="Titre du quiz" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <div className="form-grid">
                <label>Seuil de réussite (%)<input name="scoreMinimal" type="number" min="0" max="100" value={scoreMinimal} onChange={(event) => setScoreMinimal(Number(event.target.value))} required /></label>
                <div className="stack">
                  <label className="check"><input name="important" type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} /> Quiz important (fenêtre 24 h)</label>
                  <label className="check"><input name="publie" type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publier immédiatement</label>
                </div>
              </div>
              {questions.map((question, questionIndex) => (
                <fieldset className="quiz-question" key={questionIndex}>
                  <legend>Question {questionIndex + 1}</legend>
                  <input
                    value={question.libelle}
                    onChange={(event) => patchQuestion(questionIndex, {libelle: event.target.value})}
                    placeholder="Énoncé"
                    required
                  />
                  <textarea
                    value={question.explication}
                    onChange={(event) => patchQuestion(questionIndex, {explication: event.target.value})}
                    placeholder="Explication pédagogique affichée uniquement après la soumission (facultatif)"
                    maxLength={5000}
                  />
                  <label>Points<input type="number" min=".01" step=".01" value={question.points} onChange={(event) => patchQuestion(questionIndex, {points: Number(event.target.value)})} /></label>
                  {question.reponses.map((answer, answerIndex) => (
                    <div className="row" key={answerIndex}>
                      <input
                        value={answer.libelle}
                        onChange={(event) => patchQuestion(questionIndex, {
                          reponses: question.reponses.map((item, index) => index === answerIndex ? {...item, libelle: event.target.value} : item),
                        })}
                        placeholder={`Réponse ${answerIndex + 1}`}
                        required
                      />
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={answer.correcte}
                          onChange={(event) => patchQuestion(questionIndex, {
                            reponses: question.reponses.map((item, index) => index === answerIndex ? {...item, correcte: event.target.checked} : item),
                          })}
                        />
                        Correcte
                      </label>
                      {question.reponses.length > 2 && <Button type="button" variant="ghost" size="sm" aria-label={`Supprimer la réponse ${answerIndex + 1}`} onClick={() => patchQuestion(questionIndex, {reponses: question.reponses.filter((_, index) => index !== answerIndex)})}><Trash2 size={15} /></Button>}
                    </div>
                  ))}
                  <div className="form-actions quiz-question-actions">
                    <Button type="button" variant="secondary" size="sm" onClick={() => patchQuestion(questionIndex, {reponses: [...question.reponses, {libelle: "", correcte: false}]})}><Plus size={15} /> Ajouter une réponse</Button>
                    {questions.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}><Trash2 size={15} /> Retirer la question</Button>}
                  </div>
                </fieldset>
              ))}
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => setQuestions((current) => [...current, blank()])}>Ajouter une question</Button>
                {editing && <Button type="button" variant="ghost" onClick={resetEditor} disabled={saving}>Annuler la modification</Button>}
                <Button type="submit" loading={saving}>{editing ? "Enregistrer le QCM" : "Créer le QCM"}</Button>
              </div>
            </form>
          </Card>
          <div className="stack">
            <Card>
              <div className="panel-heading"><div><h2>QCM existants</h2><p>{items.length} évaluation(s)</p></div></div>
              {loading ? (
                <div className="stack"><Skeleton className="skeleton-line" /><Skeleton className="skeleton-cover" /></div>
              ) : items.length === 0 ? (
                <EmptyState title="Aucun QCM" description="Le premier QCM créé apparaîtra ici." />
              ) : (
                <div className="learning-list">
                  {items.map((quiz) => (
                    <article className="learning-row compact-row" key={quiz.id}>
                      <div>
                        <div className="row"><Badge variant={quiz.publie ? "success" : "warning"}>{quiz.publie ? "Publié" : "Brouillon"}</Badge></div>
                        <h3 className="quiz-editor-title">{quiz.titre}</h3>
                        <p>{quiz.questions.length} question(s) · seuil {quiz.scoreMinimal}% · {quiz.important ? "3/24 h" : "3/8 h"}</p>
                      </div>
                      <div className="row compact">
                        <Button variant="secondary" size="sm" onClick={() => beginEdit(quiz)}>Modifier</Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleting(quiz)}><Trash2 size={15} /> Supprimer</Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
        <ConfirmDialog
          open={Boolean(deleting)}
          title="Supprimer ce QCM ?"
          description="Les questions associées seront supprimées. Cette action est irréversible."
          confirmLabel="Supprimer"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
        />
      </AppShell>
    </Protected>
  );
}
