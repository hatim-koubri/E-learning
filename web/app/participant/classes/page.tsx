"use client";

import {CalendarDays, Clock3, ExternalLink, UsersRound, Video} from "lucide-react";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import Protected from "@/components/Protected";
import {isSessionJoinable, SessionTiming, useSessionClock} from "@/components/SessionTiming";
import {Badge, Button, Card, EmptyState, ErrorState, Modal, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {Classe, Session} from "@/lib/classes";

export default function Page() {
  const [items, setItems] = useState<Classe[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [joinTarget, setJoinTarget] = useState<Session | null>(null);
  const now = useSessionClock();

  useEffect(() => {
    api<Classe[]>("/participant/classes")
      .then(setItems)
      .catch((reason) => setError((reason as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function join(sessionId: number) {
    setJoining(sessionId);
    setError("");
    try {
      const response = await api<{joinUrl: string}>(`/participant/seances/${sessionId}/join`);
      setJoinTarget(null);
      window.location.assign(response.joinUrl);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setJoining(null);
    }
  }

  return (
    <Protected roles={["PARTICIPANT"]}>
      <AppShell role="PARTICIPANT">
        <PageHeader
          eyebrow="Classes virtuelles"
          title="Mes classes et séances"
          description="Consultez les groupes auxquels vous êtes affecté et rejoignez uniquement les séances accessibles."
        />
        {error && <ErrorState message={error} />}
        {loading ? (
          <Card><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></Card>
        ) : items.length === 0 && !error ? (
          <EmptyState
            title="Aucune classe ne vous est encore affectée"
            description="Une inscription avec l’option classes vous rend éligible. Le formateur doit ensuite vous affecter à un groupe."
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
                  <span><CalendarDays size={15} /> du {new Date(classe.dateDebut).toLocaleDateString("fr-FR")} au {new Date(classe.dateFin).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="session-list">
                  {classe.seances.length === 0 && <p>Aucune séance n’est encore planifiée.</p>}
                  {classe.seances.map((session) => {
                    return (
                      <article className="session-row" key={session.id}>
                        <div>
                          <SessionTiming session={session} now={now} />
                          <h3 className="session-title">{session.titre}</h3>
                          <span className="session-date">
                            <Clock3 size={15} /> {new Date(session.dateDebut).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <Button
                          disabled={!isSessionJoinable(session, now)}
                          loading={joining === session.id}
                          onClick={() => setJoinTarget(session)}
                        >
                          <ExternalLink size={17} /> {isSessionJoinable(session, now) ? "Rejoindre Jitsi" : "Disponible en direct"}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
        <Modal
          open={Boolean(joinTarget)}
          title="Salle d’attente NexaLearn"
          description="Vérifiez la séance avant d’ouvrir la visioconférence sécurisée."
          onClose={() => setJoinTarget(null)}
        >
          {joinTarget && (
            <div className="waiting-room stack">
              <div className="waiting-room-session">
                <span className="resource-kicker"><Video aria-hidden="true" size={17} /> Classe en direct</span>
                <h3>{joinTarget.titre}</h3>
                <p><Clock3 aria-hidden="true" size={16} /> {new Date(joinTarget.dateDebut).toLocaleString("fr-FR")}</p>
              </div>
              <p className="muted">Jitsi s’ouvrira dans cet onglet. Vous pourrez choisir votre micro et votre caméra dans son écran de préconnexion.</p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setJoinTarget(null)} disabled={joining !== null}>Retour</Button>
                <Button loading={joining === joinTarget.id} onClick={() => join(joinTarget.id)}>
                  <ExternalLink size={17} /> Ouvrir Jitsi
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </AppShell>
    </Protected>
  );
}
