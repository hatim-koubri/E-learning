"use client";

import {CalendarDays, Clock3, ExternalLink, UsersRound} from "lucide-react";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import Protected from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {Classe, Session} from "@/lib/classes";

function visualStatus(session: Session) {
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<number | null>(null);

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
                    <h2 style={{marginTop: 12}}>{classe.nom}</h2>
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
                    const status = visualStatus(session);
                    return (
                      <article className="session-row" key={session.id}>
                        <div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <h3 style={{marginTop: 10}}>{session.titre}</h3>
                          <span className="session-date">
                            <Clock3 size={15} /> {new Date(session.dateDebut).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <Button
                          disabled={session.statut !== "PLANIFIEE"}
                          loading={joining === session.id}
                          onClick={() => join(session.id)}
                        >
                          <ExternalLink size={17} /> Rejoindre Jitsi
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </AppShell>
    </Protected>
  );
}
