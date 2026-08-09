"use client";

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  Plus,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import {FormEvent, useCallback, useEffect, useMemo, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {isSessionJoinable, SessionTiming, useSessionClock} from "@/components/SessionTiming";
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {Classe, Session} from "@/lib/classes";
import type {FormationSummary} from "@/lib/formations";

type Eligible = {id: number; nom: string; email: string};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const iso = (value: FormDataEntryValue | null) => new Date(String(value)).toISOString();

export default function Page() {
  const [items, setItems] = useState<Classe[]>([]);
  const [formations, setFormations] = useState<FormationSummary[]>([]);
  const [eligible, setEligible] = useState<Record<number, Eligible[]>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [joinTarget, setJoinTarget] = useState<Session | null>(null);
  const [busy, setBusy] = useState("");
  const now = useSessionClock();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classesResult, formationsResult] = await Promise.all([
        api<Classe[]>("/formateur/classes"),
        api<FormationSummary[]>("/formateur/formations"),
      ]);
      setItems(classesResult);
      setFormations(formationsResult);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api<Classe[]>("/formateur/classes"),
      api<FormationSummary[]>("/formateur/formations"),
    ])
      .then(([classesResult, formationsResult]) => {
        setItems(classesResult);
        setFormations(formationsResult);
      })
      .catch((reason) => setError((reason as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function submitClass(event: FormEvent<HTMLFormElement>, id?: number) {
    event.preventDefault();
    setBusy(id ? `class-${id}` : "new-class");
    const data = new FormData(event.currentTarget);
    const payload = {
      formationId: Number(data.get("formationId")),
      nom: data.get("nom"),
      description: data.get("description"),
      capacite: Number(data.get("capacite")),
      dateDebut: data.get("dateDebut"),
      dateFin: data.get("dateFin"),
    };
    try {
      await api(id ? `/formateur/classes/${id}` : "/formateur/classes", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(id ? "Classe modifiée." : "Classe créée.");
      setCreating(false);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function submitSession(event: FormEvent<HTMLFormElement>, classId: number, id?: number) {
    event.preventDefault();
    setBusy(id ? `session-${id}` : `new-session-${classId}`);
    const data = new FormData(event.currentTarget);
    const payload = {
      titre: data.get("titre"),
      dateDebut: iso(data.get("debut")),
      dateFin: iso(data.get("fin")),
      fuseauHoraire: timezone(),
    };
    try {
      await api(id ? `/formateur/seances/${id}` : `/formateur/classes/${classId}/seances`, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      setNotice(id ? "Séance modifiée." : "Séance planifiée.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function candidates(id: number) {
    setBusy(`candidates-${id}`);
    try {
      const list = await api<Eligible[]>(`/formateur/classes/${id}/participants-eligibles`);
      setEligible((current) => ({...current, [id]: list}));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function assign(classId: number, participantId: number) {
    setBusy(`assign-${participantId}`);
    try {
      await api(`/formateur/classes/${classId}/membres`, {
        method: "POST",
        body: JSON.stringify({participantId}),
      });
      setNotice("Participant affecté.");
      await load();
      await candidates(classId);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    if (!cancelTarget) return;
    setBusy(`cancel-${cancelTarget.id}`);
    try {
      await api(`/formateur/seances/${cancelTarget.id}/annulation`, {method: "POST"});
      setCancelTarget(null);
      setNotice("La séance a été annulée.");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function join(id: number) {
    setBusy(`join-${id}`);
    try {
      const response = await api<{joinUrl: string}>(`/formateur/seances/${id}/join`);
      setJoinTarget(null);
      location.assign(response.joinUrl);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  const stats = useMemo(() => {
    const sessions = items.flatMap((item) => item.seances);
    return {
      sessions: sessions.length,
      members: items.reduce((sum, item) => sum + item.membres.length, 0),
      upcoming: sessions.filter((session) => session.statut === "PLANIFIEE").length,
    };
  }, [items]);

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader
          eyebrow="Classes virtuelles"
          title="Classes et séances"
          description="Créez vos groupes, affectez les participants éligibles et planifiez leurs rendez-vous Jitsi."
          actions={<Button onClick={() => setCreating(true)}><Plus size={18} /> Nouvelle classe</Button>}
        />
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <div className="stats-grid">
          <Card className="stat-card"><span className="stat-icon"><UsersRound size={21} /></span><div><small>Classes</small><strong>{items.length}</strong></div></Card>
          <Card className="stat-card"><span className="stat-icon success"><UserPlus size={21} /></span><div><small>Participants affectés</small><strong>{stats.members}</strong></div></Card>
          <Card className="stat-card"><span className="stat-icon warning"><CalendarDays size={21} /></span><div><small>Séances planifiées</small><strong>{stats.upcoming}</strong></div></Card>
          <Card className="stat-card"><span className="stat-icon"><Video size={21} /></span><div><small>Total séances</small><strong>{stats.sessions}</strong></div></Card>
        </div>

        {loading ? (
          <Card><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></Card>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune classe créée"
            description="Publiez une formation avec une offre de classes, puis créez son premier groupe."
            action={<Button onClick={() => setCreating(true)}><Plus size={17} /> Créer une classe</Button>}
          />
        ) : (
          <div className="class-grid">
            {items.map((classe) => (
              <Card className="class-card" key={classe.id}>
                <header className="class-card-header">
                  <div>
                    <Badge variant="primary">{classe.statut}</Badge>
                    <h2 className="class-title">{classe.nom}</h2>
                    <p>{classe.formation}</p>
                  </div>
                  <span className="stat-icon"><UsersRound size={21} /></span>
                </header>
                <div className="course-meta">
                  <span><CalendarDays size={15} /> {new Date(classe.dateDebut).toLocaleDateString("fr-FR")} — {new Date(classe.dateFin).toLocaleDateString("fr-FR")}</span>
                  <span><UsersRound size={15} /> {classe.membres.length}/{classe.capacite}</span>
                </div>

                <details className="upload-box">
                  <summary>Modifier la classe</summary>
                  <form className="stack section-space" onSubmit={(event) => submitClass(event, classe.id)}>
                    <ClassFields formations={formations} value={classe} />
                    <Button type="submit" loading={busy === `class-${classe.id}`}>Enregistrer</Button>
                  </form>
                </details>

                <div className="form-section form-section-spaced">
                  <div className="row spread"><strong>Participants ({classe.membres.length}/{classe.capacite})</strong></div>
                  {classe.membres.length ? (
                    <div className="learning-list">
                      {classe.membres.map((member) => (
                        <div className="learning-row compact-row" key={member.id}>
                          <div><strong>{member.nom}</strong><p>{member.email}</p></div>
                          <Badge variant="success">{member.statut}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : <p>Aucun participant affecté.</p>}
                  <Button variant="secondary" loading={busy === `candidates-${classe.id}`} onClick={() => candidates(classe.id)}>
                    Afficher les participants éligibles
                  </Button>
                  {eligible[classe.id]?.map((participant) => (
                    <div className="learning-row compact-row" key={participant.id}>
                      <div><strong>{participant.nom}</strong><p>{participant.email}</p></div>
                      <Button size="sm" loading={busy === `assign-${participant.id}`} onClick={() => assign(classe.id, participant.id)}>Affecter</Button>
                    </div>
                  ))}
                </div>

                <div className="form-section form-section-spaced">
                  <strong>Séances</strong>
                  <form className="stack upload-box" onSubmit={(event) => submitSession(event, classe.id)}>
                    <SessionFields />
                    <Button type="submit" loading={busy === `new-session-${classe.id}`}>Planifier</Button>
                  </form>
                  <div className="session-list">
                    {classe.seances.map((session) => {
                      return (
                        <article className="session-row" key={session.id}>
                          <div>
                            <SessionTiming session={session} now={now} />
                            <h3 className="session-title">{session.titre}</h3>
                            <span className="session-date"><Clock3 size={15} /> {new Date(session.dateDebut).toLocaleString("fr-FR")}</span>
                            {session.statut === "PLANIFIEE" && (
                              <details className="upload-box">
                                <summary>Modifier</summary>
                                <form className="stack section-space" onSubmit={(event) => submitSession(event, classe.id, session.id)}>
                                  <SessionFields value={session} />
                                  <Button type="submit" loading={busy === `session-${session.id}`}>Enregistrer</Button>
                                </form>
                              </details>
                            )}
                          </div>
                          {session.statut === "PLANIFIEE" && (
                            <div className="row compact">
                              <Button size="sm" disabled={!isSessionJoinable(session, now)} onClick={() => setJoinTarget(session)}><ExternalLink size={15} /> {isSessionJoinable(session, now) ? "Préparer la séance" : "Disponible en direct"}</Button>
                              <Button variant="danger" size="sm" onClick={() => setCancelTarget(session)}>Annuler</Button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal open={creating} title="Nouvelle classe" description="Associez le groupe à une formation publiée." onClose={() => setCreating(false)}>
          <form className="stack" onSubmit={(event) => submitClass(event)}>
            <ClassFields formations={formations} />
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Fermer</Button>
              <Button type="submit" loading={busy === "new-class"}>Créer la classe</Button>
            </div>
          </form>
        </Modal>
        <Modal
          open={Boolean(joinTarget)}
          title="Salle d’attente NexaLearn"
          description="Contrôlez la séance avant d’ouvrir votre salle Jitsi formateur."
          onClose={() => setJoinTarget(null)}
        >
          {joinTarget && (
            <div className="waiting-room stack">
              <div className="waiting-room-session">
                <span className="resource-kicker"><Video aria-hidden="true" size={17} /> Animation en direct</span>
                <h3>{joinTarget.titre}</h3>
                <p><Clock3 aria-hidden="true" size={16} /> {new Date(joinTarget.dateDebut).toLocaleString("fr-FR")}</p>
              </div>
              <p className="muted">Jitsi s’ouvrira dans cet onglet avec vos droits de modération. Le choix du micro et de la caméra reste géré par son écran de préconnexion.</p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setJoinTarget(null)} disabled={busy === `join-${joinTarget.id}`}>Retour</Button>
                <Button loading={busy === `join-${joinTarget.id}`} onClick={() => join(joinTarget.id)}>
                  <ExternalLink size={17} /> Ouvrir Jitsi
                </Button>
              </div>
            </div>
          )}
        </Modal>
        <ConfirmDialog
          open={Boolean(cancelTarget)}
          title="Annuler cette séance ?"
          description={`La séance « ${cancelTarget?.titre ?? ""} » ne sera plus accessible aux participants.`}
          confirmLabel="Annuler la séance"
          danger
          busy={busy.startsWith("cancel-")}
          onCancel={() => setCancelTarget(null)}
          onConfirm={cancel}
        />
      </AppShell>
    </Protected>
  );
}

function ClassFields({formations, value}: {formations: FormationSummary[]; value?: Classe}) {
  return (
    <div className="form-grid">
      <label>
        Formation
        <select name="formationId" required defaultValue={value?.formationId}>
          <option value="">Sélectionner une formation</option>
          {formations.filter((formation) => formation.statut === "PUBLIEE").map((formation) => (
            <option key={formation.id} value={formation.id}>{formation.titre}</option>
          ))}
        </select>
      </label>
      <label>Nom<input name="nom" required maxLength={180} defaultValue={value?.nom} /></label>
      <label>Description<textarea name="description" maxLength={10000} defaultValue={value?.description} /></label>
      <label>Capacité<input name="capacite" type="number" min="1" required defaultValue={value?.capacite ?? 20} /></label>
      <label>Début<input name="dateDebut" type="date" required defaultValue={value?.dateDebut} /></label>
      <label>Fin<input name="dateFin" type="date" required defaultValue={value?.dateFin} /></label>
    </div>
  );
}

function SessionFields({value}: {value?: Session}) {
  const local = (date?: string) => {
    if (!date) return undefined;
    const instant = new Date(date);
    if (Number.isNaN(instant.getTime())) return undefined;
    const offset = instant.getTimezoneOffset() * 60_000;
    return new Date(instant.getTime() - offset).toISOString().slice(0, 16);
  };
  return (
    <div className="form-grid">
      <label>Titre<input name="titre" required maxLength={180} defaultValue={value?.titre} /></label>
      <label>Début<input name="debut" type="datetime-local" required defaultValue={local(value?.dateDebut)} /></label>
      <label>Fin<input name="fin" type="datetime-local" required defaultValue={local(value?.dateFin)} /></label>
    </div>
  );
}
