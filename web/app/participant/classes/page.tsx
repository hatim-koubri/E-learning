"use client";

import {CalendarDays, Clock3, ExternalLink, UsersRound, Video} from "lucide-react";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import Protected from "@/components/Protected";
import {isSessionJoinable, SessionTiming, useSessionClock} from "@/components/SessionTiming";
import {Badge, Button, Card, EmptyState, ErrorState, Modal, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import {openMeeting, type MeetingAccess} from "@/lib/meeting";
import {loadParticipantClasses, type ParticipantClasse, type Session} from "@/lib/classes";

export default function Page() {
  const [items, setItems] = useState<ParticipantClasse[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);
  const [joinTarget, setJoinTarget] = useState<Session | null>(null);
  const [expandedClasses, setExpandedClasses] = useState<Record<number, boolean>>({});
  const now = useSessionClock();

  async function load(refresh = false) {
    setLoading(true);
    setError("");
    try {
      setItems(await loadParticipantClasses({refresh}));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadParticipantClasses()
      .then((classes) => { if (active) setItems(classes); })
      .catch((reason) => { if (active) setError((reason as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const waitingForHost = items.some((classe) => classe.seances.some((session) =>
    isSessionJoinable(session, now) && !session.hostReady));

  useEffect(() => {
    if (!waitingForHost) return;
    const timer = window.setInterval(() => {
      loadParticipantClasses({refresh: true}).then(setItems).catch(() => undefined);
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [waitingForHost]);

  async function join(sessionId: number) {
    setJoining(sessionId);
    setError("");
    try {
      const response = await api<MeetingAccess>(`/participant/seances/${sessionId}/join`);
      setJoinTarget(null);
      openMeeting(response, "/participant/classes");
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
        {error && <ErrorState message={error} onRetry={() => void load(true)} />}
        {loading ? (
          <div className="class-grid" aria-label="Chargement des classes">
            {[0, 1].map((item) => (
              <Card className="class-card" key={item}>
                <Skeleton className="skeleton-line short" />
                <Skeleton className="skeleton-line medium" />
                <Skeleton className="skeleton-line long" />
                <div className="session-list">
                  <Skeleton className="skeleton-line long" />
                  <Skeleton className="skeleton-line medium" />
                </div>
              </Card>
            ))}
          </div>
        ) : items.length === 0 && !error ? (
          <EmptyState
            title="Aucune classe ne vous est encore affectée"
            description="Une inscription avec l’option classes vous rend éligible. Le formateur doit ensuite vous affecter à un groupe."
          />
        ) : (
          <div className="class-grid">
            {items.map((classe) => {
              const sessions=classe.seances
                .filter((session)=>session.statut==="PLANIFIEE"&&(now===null||new Date(session.dateFin).getTime()>now))
                .sort((a,b)=>new Date(a.dateDebut).getTime()-new Date(b.dateDebut).getTime());
              const expanded=Boolean(expandedClasses[classe.id]);
              const visibleSessions=expanded?sessions:sessions.slice(0,1);
              const hiddenCount=Math.max(0,sessions.length-1);
              return <Card className="class-card participant-class-card" key={classe.id}>
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
                <div className="session-list participant-session-list">
                  {sessions.length === 0 && <div className="participant-no-session"><Video size={21}/><div><strong>Aucune séance à venir</strong><p>Le formateur n’a pas encore planifié de nouveau rendez-vous.</p></div></div>}
                  {visibleSessions.map((session) => {
                    const joinable=isSessionJoinable(session,now);
                    return (
                      <article className={`session-row participant-session-row ${joinable?"live":"upcoming"}`} key={session.id}>
                        <div>
                          <SessionTiming session={session} now={now} />
                          <h3 className="session-title">{session.titre}</h3>
                          <span className="session-date">
                            <Clock3 size={15} /> {new Date(session.dateDebut).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        {joinable&&session.hostReady&&<Button loading={joining===session.id} onClick={()=>setJoinTarget(session)}><ExternalLink size={17}/> Rejoindre Jitsi</Button>}
                        {joinable&&!session.hostReady&&<span className="participant-host-waiting">En attente du formateur</span>}
                      </article>
                    );
                  })}
                </div>
                {hiddenCount>0&&<Button className="participant-more-sessions" variant="secondary" onClick={()=>setExpandedClasses((current)=>({...current,[classe.id]:!expanded}))}>{expanded?"Masquer les autres séances":`Voir ${hiddenCount} autre${hiddenCount>1?"s":""} séance${hiddenCount>1?"s":""}`}</Button>}
              </Card>;
            })}
          </div>
        )}
        <Modal
          open={Boolean(joinTarget)}
          title="Salle d’attente Khotwa"
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
              <p className="muted">Votre nom de compte Khotwa sera utilisé automatiquement. La salle devient accessible dès que le formateur l’a ouverte.</p>
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
