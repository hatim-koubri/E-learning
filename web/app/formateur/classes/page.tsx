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
import {Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {Classe, Session} from "@/lib/classes";
import type {FormationSummary} from "@/lib/formations";

type Eligible = {id: number; nom: string; email: string};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const iso = (value: FormDataEntryValue | null) => new Date(String(value)).toISOString();

function sessionStatus(session: Session) {
  if (session.statut === "ANNULEE") return {label: "Annulée", variant: "danger" as const};
  if (session.statut === "TERMINEE") return {label: "Terminée", variant: "neutral" as const};
  const now = Date.now();
  if (new Date(session.dateDebut).getTime() <= now && new Date(session.dateFin).getTime() >= now) {
    return {label: "En direct", variant: "live" as const};
  }
  return {label: "Planifiée", variant: "warning" as const};
}

export default function Page() {
  const [items, setItems] = useState<Classe[]>([]);
  const [formations, setFormations] = useState<FormationSummary[]>([]);
  const [eligible, setEligible] = useState<Record<number, Eligible[]>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [busy, setBusy] = useState("");

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
                    <h2 style={{marginTop: 12}}>{classe.nom}</h2>
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

                <div className="form-section" style={{marginTop: 18}}>
                  <div className="row spread"><strong>Participants ({classe.membres.length}/{classe.capacite})</strong></div>
                  {classe.membres.length ? (
                    <div className="learning-list">
                      {classe.membres.map((member) => (
                        <div className="learning-row" style={{gridTemplateColumns: "1fr auto"}} key={member.id}>
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
                    <div className="learning-row" style={{gridTemplateColumns: "1fr auto"}} key={participant.id}>
                      <div><strong>{participant.nom}</strong><p>{participant.email}</p></div>
                      <Button size="sm" loading={busy === `assign-${participant.id}`} onClick={() => assign(classe.id, participant.id)}>Affecter</Button>
                    </div>
                  ))}
                </div>

                <div className="form-section" style={{marginTop: 18}}>
                  <strong>Séances</strong>
                  <form className="stack upload-box" onSubmit={(event) => submitSession(event, classe.id)}>
                    <SessionFields />
                    <Button type="submit" loading={busy === `new-session-${classe.id}`}>Planifier</Button>
                  </form>
                  <div className="session-list">
                    {classe.seances.map((session) => {
                      const status = sessionStatus(session);
                      return (
                        <article className="session-row" key={session.id}>
                          <div>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <h3 style={{marginTop: 10}}>{session.titre}</h3>
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
                              <Button size="sm" loading={busy === `join-${session.id}`} onClick={() => join(session.id)}><ExternalLink size={15} /> Ouvrir Jitsi</Button>
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
  const local = (date?: string) => date ? new Date(date).toISOString().slice(0, 16) : undefined;
  return (
    <div className="form-grid">
      <label>Titre<input name="titre" required maxLength={180} defaultValue={value?.titre} /></label>
      <label>Début<input name="debut" type="datetime-local" required defaultValue={local(value?.dateDebut)} /></label>
      <label>Fin<input name="fin" type="datetime-local" required defaultValue={local(value?.dateFin)} /></label>
    </div>
  );
}
