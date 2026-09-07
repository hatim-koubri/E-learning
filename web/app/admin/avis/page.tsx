"use client";

import {Eye, EyeOff, Flag, GraduationCap, MessageSquareReply, Star, UserRound} from "lucide-react";
import {useCallback, useEffect, useId, useRef, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, Pagination, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {ModerationCase, ModerationQueue} from "@/lib/engagement";

type ModerationAction = "REPUBLIER" | "MASQUER";
type Confirmation = {moderationCase: ModerationCase; action: ModerationAction};

const CONFLICT_MESSAGE =
  "Cet avis vient d’être traité par un autre administrateur. La file a été actualisée.";

function statusOf(reason: unknown) {
  return typeof reason === "object" && reason !== null && "status" in reason
    ? (reason as {status?: number}).status
    : undefined;
}

function messageOf(reason: unknown) {
  const status = statusOf(reason);
  if (status === 401) return "Votre session administrateur a expiré. Reconnectez-vous.";
  if (status === 403) return "Votre compte n’est pas autorisé à accéder à la modération.";
  return reason instanceof Error ? reason.message : "Une erreur est survenue.";
}

function safeDate(value?: string | null) {
  if (!value) return "Date non disponible";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date non disponible"
    : date.toLocaleString("fr-FR", {dateStyle: "medium", timeStyle: "short"});
}

function ExpandableText({text}: {text: string}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const expandable = text.length > 320;
  return <div className="moderation-text-block">
    <p className={`moderation-long-text${expandable && !expanded ? " is-collapsed" : ""}`} id={id}>{text}</p>
    {expandable && <button type="button" className="link-button moderation-text-toggle" aria-controls={id} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Réduire le texte" : "Lire le texte complet"}
    </button>}
  </div>;
}

export default function ReviewModerationPage() {
  const [data, setData] = useState<ModerationQueue | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busyReviewIds, setBusyReviewIds] = useState<Set<number>>(() => new Set());
  const pendingReviewIds = useRef(new Set<number>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<ModerationQueue>(`/admin/avis/signalements?page=${page}&size=20`);
      if (response.content.length === 0 && page > 0 && response.totalPages <= page) {
        setPage(Math.max(0, response.totalPages - 1));
        return;
      }
      setData(response);
      setLoadError("");
    } catch (reason) {
      setLoadError(messageOf(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // The request owns the initial loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function begin(reviewId: number) {
    if (pendingReviewIds.current.has(reviewId)) return false;
    pendingReviewIds.current.add(reviewId);
    setBusyReviewIds((current) => new Set(current).add(reviewId));
    setError("");
    setNotice("");
    return true;
  }

  function finish(reviewId: number) {
    pendingReviewIds.current.delete(reviewId);
    setBusyReviewIds((current) => {
      const next = new Set(current);
      next.delete(reviewId);
      return next;
    });
  }

  function closeConfirmation() {
    if (confirmation && busyReviewIds.has(confirmation.moderationCase.avis.id)) return;
    setConfirmation(null);
  }

  async function moderate() {
    if (!confirmation) return;
    const {moderationCase, action} = confirmation;
    const reviewId = moderationCase.avis.id;
    if (!begin(reviewId)) return;
    try {
      const endpoint = action === "REPUBLIER" ? "republier" : "masquer";
      await api(`/admin/avis/${reviewId}/${endpoint}`, {method: "PATCH"});
      setConfirmation(null);
      setNotice(action === "REPUBLIER"
        ? "L’avis a été republié et tous ses signalements ont été résolus."
        : "Le masquage a été confirmé et tous les signalements ont été résolus.");
      await load();
    } catch (reason) {
      if (statusOf(reason) === 409) {
        setConfirmation(null);
        await load();
        setError(CONFLICT_MESSAGE);
      } else {
        setError(messageOf(reason));
      }
    } finally {
      finish(reviewId);
    }
  }

  return (
    <Protected role="ADMIN">
      <AppShell role="ADMIN">
        <PageHeader
          eyebrow="Modération"
          title="Avis signalés"
          description="Examinez le contenu et son contexte avant de republier l’avis ou de confirmer son masquage."
        />
        <div aria-live="assertive" aria-atomic="true">
          {error && <Alert variant="error">{error}</Alert>}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {notice && <Alert variant="success">{notice}</Alert>}
        </div>

        {loading ? (
          <Card><div className="stack"><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></div></Card>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : data?.content.length ? (
          <>
          <div className="review-list moderation-list">
            {data.content.map((moderationCase) => {
              const busy = busyReviewIds.has(moderationCase.avis.id);
              return (
                <Card className="moderation-card" key={moderationCase.avis.id}>
                  <div className="moderation-heading">
                    <div className="row">
                      <span className="stat-icon warning"><Flag aria-hidden="true" size={18} /></span>
                      <div>
                        <span className="field-hint">Avis #{moderationCase.avis.id} · {moderationCase.signalements.length} signalement{moderationCase.signalements.length > 1 ? "s" : ""}</span>
                        <h2>{moderationCase.contexte.formationTitre}</h2>
                      </div>
                    </div>
                    <div className="moderation-status"><span className="field-hint">Statut</span><Badge variant="warning">En attente</Badge></div>
                  </div>

                  <div className="moderation-meta">
                    <span><UserRound aria-hidden="true" size={16} /> Avis de <strong>{moderationCase.contexte.auteurNom}</strong></span>
                    <span><GraduationCap aria-hidden="true" size={16} /> Formateur <strong>{moderationCase.contexte.formateurNom}</strong></span>
                    <span><Flag aria-hidden="true" size={16} /> Premier signalement <strong>{safeDate(moderationCase.signalements[0]?.date)}</strong></span>
                  </div>

                  <div className="moderation-context-grid">
                    <section>
                      <div className="moderation-section-title">
                        <Star aria-hidden="true" size={17} />
                        <h3>Avis — <span aria-label={`Note ${moderationCase.avis.note} sur 5`}>{moderationCase.avis.note}/5</span></h3>
                      </div>
                      <ExpandableText text={moderationCase.avis.commentaire} />
                      <small className="muted">Créé le {safeDate(moderationCase.avis.createdAt)} · dernière modification {safeDate(moderationCase.avis.updatedAt)}</small>
                    </section>
                    <section>
                      <div className="moderation-section-title">
                        <MessageSquareReply aria-hidden="true" size={17} />
                        <h3>Réponse du formateur</h3>
                      </div>
                      <ExpandableText text={moderationCase.avis.reponseFormateur || "Aucune réponse du formateur."} />
                    </section>
                    <section className="moderation-report-reason">
                      <div className="moderation-section-title"><Flag aria-hidden="true" size={17} /><h3>Signalements reçus</h3></div>
                      <ol className="moderation-report-list">
                        {moderationCase.signalements.map((signalement) => (
                          <li key={signalement.id}>
                            <div><strong>Signalement #{signalement.id}</strong><small>{safeDate(signalement.date)}</small></div>
                            <ExpandableText text={signalement.motif} />
                          </li>
                        ))}
                      </ol>
                    </section>
                  </div>

                  <div className="moderation-consequences" aria-label="Conséquences des décisions">
                    <p><Eye aria-hidden="true" size={17} /><span><strong>Republier</strong> — l’avis redevient public et réintègre les moyennes.</span></p>
                    <p><EyeOff aria-hidden="true" size={17} /><span><strong>Masquer</strong> — l’avis reste absent du public et des moyennes.</span></p>
                  </div>

                  <div className="form-actions moderation-actions" aria-label={`Décider pour l’avis ${moderationCase.avis.id}`}>
                    <Button variant="secondary" disabled={busy} onClick={() => setConfirmation({moderationCase, action: "REPUBLIER"})}>
                      <Eye size={16} /> Republier l’avis
                    </Button>
                    <Button variant="danger" disabled={busy} onClick={() => setConfirmation({moderationCase, action: "MASQUER"})}>
                      <EyeOff size={16} /> Confirmer le masquage
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => Math.min(data.totalPages - 1, current + 1))} />
          </>
        ) : (
          <EmptyState title="Aucun signalement à traiter" description="La file de modération est à jour." />
        )}

        <Modal
          open={Boolean(confirmation)}
          title={confirmation?.action === "REPUBLIER" ? "Republier cet avis ?" : "Confirmer le masquage ?"}
          description={confirmation?.action === "REPUBLIER"
            ? "L’avis redeviendra public et sera de nouveau inclus dans la moyenne. Tous ses signalements en attente seront résolus."
            : "L’avis restera absent du public et de la moyenne. Tous ses signalements en attente seront résolus."}
          onClose={closeConfirmation}
          initialFocusSelector="[data-moderation-cancel]"
        >
          <div className="modal-actions">
            <Button
              data-moderation-cancel
              variant="secondary"
              disabled={Boolean(confirmation && busyReviewIds.has(confirmation.moderationCase.avis.id))}
              onClick={closeConfirmation}
            >
              Annuler
            </Button>
            <Button
              variant={confirmation?.action === "MASQUER" ? "danger" : "primary"}
              loading={Boolean(confirmation && busyReviewIds.has(confirmation.moderationCase.avis.id))}
              onClick={moderate}
            >
              {confirmation?.action === "REPUBLIER" ? "Confirmer la republication" : "Confirmer le masquage"}
            </Button>
          </div>
        </Modal>
      </AppShell>
    </Protected>
  );
}
