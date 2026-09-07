"use client";

import {Check, Eye, Mail, Phone, UserCheck, X} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Modal, Pagination, Skeleton} from "@/components/ui";
import {api, type Formateur, type FormateurApplication, type FormateurPage} from "@/lib/api";

const CONCURRENT_DECISION_MESSAGE =
  "Cette demande vient d’être traitée par un autre administrateur. La liste a été actualisée.";

function requestDate(value?: string) {
  if (!value) return "Non renseignée";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseignée";
  return date.toLocaleDateString("fr-FR", {dateStyle: "medium"});
}

function errorMessage(reason: unknown) {
  const status = errorStatus(reason);
  if (status === 401) return "Votre session administrateur a expiré. Reconnectez-vous.";
  if (status === 403) return "Votre compte n’est pas autorisé à accéder aux demandes Formateur.";
  return reason instanceof Error ? reason.message : "Une erreur est survenue.";
}

function errorStatus(reason: unknown) {
  return typeof reason === "object" && reason !== null && "status" in reason
    ? (reason as {status?: number}).status
    : undefined;
}

export default function Page() {
  const [data, setData] = useState<FormateurPage | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<FormateurApplication | null>(null);
  const [confirming, setConfirming] = useState<Formateur | null>(null);
  const [refusing, setRefusing] = useState<Formateur | null>(null);
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());
  const pendingIds = useRef(new Set<number>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response=await api<FormateurPage>(`/admin/formateurs/demandes?page=${page}&size=20`);
      if(response.content.length===0&&page>0&&response.totalPages<=page){
        setPage(Math.max(0,response.totalPages-1));
        return;
      }
      setData(response);
      setLoadError("");
    } catch (reason) {
      setLoadError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // The request deliberately owns the loading state for the initial page load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function beginDecision(id: number) {
    if (pendingIds.current.has(id)) return false;
    pendingIds.current.add(id);
    setBusyIds((current) => new Set(current).add(id));
    setError("");
    setNotice("");
    return true;
  }

  function finishDecision(id: number) {
    pendingIds.current.delete(id);
    setBusyIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  async function handleConflict() {
    setConfirming(null);
    setRefusing(null);
    setMotif("");
    await load();
    setError(CONCURRENT_DECISION_MESSAGE);
  }

  async function accept() {
    if (!confirming || !beginDecision(confirming.id)) return;
    const id = confirming.id;
    try {
      await api(`/admin/formateurs/${id}/accepter`, {method: "PATCH"});
      setConfirming(null);
      setNotice("La demande a été acceptée. Le formateur peut désormais se connecter.");
      await load();
    } catch (reason) {
      if (errorStatus(reason) === 409) await handleConflict();
      else setError(errorMessage(reason));
    } finally {
      finishDecision(id);
    }
  }

  async function refuse() {
    if (!refusing || !motif.trim() || !beginDecision(refusing.id)) return;
    const id = refusing.id;
    try {
      await api(`/admin/formateurs/${id}/refuser`, {
        method: "PATCH",
        body: JSON.stringify({motif: motif.trim()}),
      });
      setNotice("La demande a été refusée et le motif a été enregistré.");
      setRefusing(null);
      setMotif("");
      await load();
    } catch (reason) {
      if (errorStatus(reason) === 409) await handleConflict();
      else setError(errorMessage(reason));
    } finally {
      finishDecision(id);
    }
  }

  async function details(id: number) {
    setError("");
    try {
      setSelected(await api<FormateurApplication>(`/admin/formateurs/demandes/${id}`));
    } catch (reason) {
      if (errorStatus(reason) === 404) {
        await load();
        setError(CONCURRENT_DECISION_MESSAGE);
      } else {
        setError(errorMessage(reason));
      }
    }
  }

  function closeAcceptance() {
    if (!confirming || !busyIds.has(confirming.id)) setConfirming(null);
  }

  function closeRefusal() {
    if (refusing && busyIds.has(refusing.id)) return;
    setRefusing(null);
    setMotif("");
  }

  return (
    <Protected role="ADMIN">
      <AppShell role="ADMIN">
        <PageHeader
          eyebrow="Administration"
          title="Demandes formateurs"
          description="Examinez chaque candidature et rendez une décision explicite avant d’ouvrir l’accès formateur."
        />
        <div aria-live="assertive" aria-atomic="true">
          {error && <Alert variant="error">{error}</Alert>}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {notice && <Alert variant="success">{notice}</Alert>}
        </div>

        <Card>
          <div className="panel-heading">
            <div><h2>Candidatures à traiter</h2><p>{data?.totalElements ?? 0} demande(s) nécessitent une décision.</p></div>
            <span className="stat-icon"><UserCheck size={21} /></span>
          </div>
          {loading ? (
            <div className="stack"><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></div>
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={load} />
          ) : data?.content.length ? (
            <>
            <ol className="admin-request-list">
              {data.content.map((formateur) => {
                const busy = busyIds.has(formateur.id);
                return (
                  <li className="admin-request-item" key={formateur.id}>
                    <div className="admin-request-identity">
                      <span className="field-hint">Identité</span>
                      <h3>{formateur.nom}</h3>
                      <p><span className="sr-only">Date de demande : </span>{requestDate(formateur.createdAt)}</p>
                    </div>
                    <dl className="admin-request-contact">
                      <div><dt><Mail aria-hidden="true" size={16} /> Email</dt><dd>{formateur.email}</dd></div>
                      <div><dt><Phone aria-hidden="true" size={16} /> Téléphone</dt><dd>{formateur.telephone || "Non renseigné"}</dd></div>
                    </dl>
                    <div className="admin-request-status">
                      <span className="field-hint">Statut</span>
                      <Badge variant="warning">En attente</Badge>
                    </div>
                    <div className="admin-decision-actions" aria-label={`Actions pour ${formateur.nom}`}>
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => details(formateur.id)}><Eye aria-hidden="true" size={16} /> Détails</Button>
                      <div className="admin-sensitive-actions">
                        <Button size="sm" disabled={busy} onClick={() => setConfirming(formateur)}><Check aria-hidden="true" size={16} /> Accepter</Button>
                        <Button size="sm" variant="danger" disabled={busy} onClick={() => setRefusing(formateur)}><X aria-hidden="true" size={16} /> Refuser</Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Pagination page={data.page} totalPages={data.totalPages}
              onPrevious={() => setPage((current) => Math.max(0,current-1))}
              onNext={() => setPage((current) => Math.min(data.totalPages-1,current+1))} />
            </>
          ) : (
            <EmptyState
              title="Aucune demande en attente"
              description="Les nouvelles candidatures formateurs apparaîtront ici."
            />
          )}
        </Card>

        <Modal open={Boolean(selected)} title="Détail du formateur" description="Informations utiles déclarées lors de l’inscription." onClose={() => setSelected(null)}>
          {selected && (
            <div className="stack">
              <div><span className="field-hint">Nom</span><strong className="field-value">{selected.profil.nom}</strong></div>
              <div><span className="field-hint">Email</span><strong className="field-value">{selected.profil.email}</strong></div>
              <div><span className="field-hint">Téléphone</span><strong className="field-value">{selected.profil.telephone || "Non renseigné"}</strong></div>
              <div><span className="field-hint">Spécialité</span><strong className="field-value">{selected.profil.specialite}</strong></div>
              <div><span className="field-hint">Présentation professionnelle</span><p>{selected.profil.biographie}</p></div>
              <div><span className="field-hint">Date de demande</span><strong className="field-value">{requestDate(selected.profil.createdAt)}</strong></div>
              <div><span className="field-hint">Statut</span><Badge variant="warning">En attente</Badge></div>
              <section><h3>Documents de candidature</h3>{selected.justificatifs.length?<ul className="trainer-credential-list">{selected.justificatifs.map(document=><li key={document.id}><div><Badge>{document.type === "CV" ? "CV" : document.type === "AUTRE" ? "Document complémentaire" : document.type === "DIPLOME" ? "Diplôme" : "Certificat"}</Badge><strong>{document.nomFichier}</strong><small>{Math.ceil(document.taille/1024)} Ko</small></div><a className="btn btn-secondary btn-sm" href={document.urlTemporaire} target="_blank" rel="noreferrer">Consulter le document</a></li>)}</ul>:<Alert variant="warning">Aucun document disponible. Ne validez pas cette candidature.</Alert>}</section>
              <div className="form-actions"><Button variant="secondary" onClick={() => setSelected(null)}>Fermer</Button></div>
            </div>
          )}
        </Modal>

        <Modal
          open={Boolean(confirming)}
          title="Accepter cette demande ?"
          description={`${confirming?.nom ?? "Ce formateur"} pourra immédiatement se connecter à son espace formateur.`}
          onClose={closeAcceptance}
          initialFocusSelector="[data-admin-accept-cancel]"
        >
          <div className="modal-actions">
            <Button data-admin-accept-cancel variant="secondary" disabled={Boolean(confirming && busyIds.has(confirming.id))} onClick={closeAcceptance}>Annuler</Button>
            <Button loading={Boolean(confirming && busyIds.has(confirming.id))} onClick={accept}>Confirmer l’acceptation</Button>
          </div>
        </Modal>

        <Modal
          open={Boolean(refusing)}
          title="Refuser cette demande ?"
          description={`Le motif sera enregistré et envoyé à ${refusing?.nom ?? "ce formateur"}.`}
          onClose={closeRefusal}
          initialFocusSelector="[data-admin-refusal-reason]"
        >
          <div className="stack">
            <label>
              Motif du refus
              <textarea
                data-admin-refusal-reason
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                required
                maxLength={500}
                aria-describedby="admin-refusal-count"
                placeholder="Expliquez clairement la décision…"
              />
            </label>
            <p className="field-hint admin-character-count" id="admin-refusal-count">{motif.length}/500 caractères</p>
            <div className="form-actions">
              <Button variant="secondary" disabled={Boolean(refusing && busyIds.has(refusing.id))} onClick={closeRefusal}>Annuler</Button>
              <Button variant="danger" disabled={!motif.trim()} loading={Boolean(refusing && busyIds.has(refusing.id))} onClick={refuse}>Confirmer le refus</Button>
            </div>
          </div>
        </Modal>
      </AppShell>
    </Protected>
  );
}
