"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LogOut,
  TrendingUp,
} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, ProgressBar, Skeleton} from "@/components/ui";
import {api, currentUser, logout, type User} from "@/lib/api";
import type {Classe} from "@/lib/classes";
import type {MyFormation} from "@/lib/learning";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [formations, setFormations] = useState<MyFormation[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sessionUser = currentUser();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const me = await api<User>("/auth/me");
        setUser(me);
        if (me.role === "PARTICIPANT") {
          const [myFormations, myClasses] = await Promise.all([
            api<MyFormation[]>("/participant/formations"),
            api<Classe[]>("/participant/classes"),
          ]);
          setFormations(Array.isArray(myFormations) ? myFormations : []);
          setClasses(Array.isArray(myClasses) ? myClasses : []);
        }
      } catch (reason) {
        setError((reason as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const nextSession = useMemo(() => {
    return classes
      .flatMap((item) => item.seances.map((session) => ({...session, classe: item.nom, formation: item.formation})))
      .filter((session) => session.statut === "PLANIFIEE")
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime())[0];
  }, [classes]);

  const averageProgress = formations.length
    ? Math.round(formations.reduce((sum, item) => sum + Number(item.progression), 0) / formations.length)
    : 0;
  const role = user?.role ?? sessionUser?.role ?? "PARTICIPANT";

  return (
    <Protected>
      <AppShell role={role}>
        {loading ? (
          <div className="stack" role="status">
            <Skeleton className="skeleton-line medium" />
            <Skeleton className="skeleton-cover" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : user && user.role === "PARTICIPANT" ? (
          <>
            <PageHeader
              eyebrow="Tableau de bord participant"
              title={`Bonjour, ${user.nom}`}
              description="Reprenez une formation, consultez votre progression ou préparez votre prochaine classe."
              actions={<Button variant="secondary" onClick={logout}><LogOut size={17} /> Se déconnecter</Button>}
            />
            <section className="profile-hero surface-card">
              <span className="profile-avatar">{user.nom.slice(0, 1).toUpperCase()}</span>
              <div>
                <h1>{user.nom}</h1>
                <p>{user.email}{user.telephone ? ` · ${user.telephone}` : ""}</p>
              </div>
              <Badge variant="success">{user.statut}</Badge>
            </section>

            <div className="stats-grid">
              <Card className="stat-card">
                <span className="stat-icon"><BookOpen size={21} /></span>
                <div><small>Formations inscrites</small><strong>{formations.length}</strong></div>
              </Card>
              <Card className="stat-card">
                <span className="stat-icon success"><TrendingUp size={21} /></span>
                <div><small>Progression moyenne</small><strong>{averageProgress}%</strong></div>
              </Card>
              <Card className="stat-card">
                <span className="stat-icon warning"><CalendarDays size={21} /></span>
                <div><small>Classes affectées</small><strong>{classes.length}</strong></div>
              </Card>
              <Card className="stat-card">
                <span className="stat-icon"><ClipboardCheck size={21} /></span>
                <div><small>Accès aux QCM</small><strong>{formations.length ? "Disponible" : "—"}</strong></div>
              </Card>
            </div>

            <div className="dashboard-grid">
              <Card>
                <div className="panel-heading">
                  <div><h2>Mes apprentissages</h2><p>Vos inscriptions et leur progression enregistrée.</p></div>
                  <Link className="text-link" href="/catalogue">Explorer <ArrowRight size={16} /></Link>
                </div>
                {formations.length ? (
                  <div className="learning-list">
                    {formations.map((formation) => (
                      <article className="learning-row" key={formation.inscriptionId}>
                        <div>
                          <h3>{formation.titre}</h3>
                          <p>{formation.typeAcces === "CONTENU_ET_CLASSES" ? "Contenu et classes" : "Contenu"} · {formation.statut}</p>
                        </div>
                        <ProgressBar value={Number(formation.progression)} />
                        <Link className="btn btn-secondary" href={`/catalogue/${formation.formationId}`}>
                          Continuer <ArrowRight size={16} />
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Aucune formation inscrite"
                    description="Explorez le catalogue et ouvrez l’aperçu d’une formation avant de vous inscrire."
                    action={<Link className="btn btn-primary" href="/catalogue">Explorer le catalogue</Link>}
                  />
                )}
              </Card>
              <div className="stack">
                <Card>
                  <div className="panel-heading"><div><h2>Prochaine classe</h2><p>Votre prochaine séance planifiée.</p></div></div>
                  {nextSession ? (
                    <div className="stack">
                      <Badge variant="warning">Planifiée</Badge>
                      <div><strong>{nextSession.titre}</strong><p>{nextSession.formation} · {nextSession.classe}</p></div>
                      <span className="session-date"><CalendarDays size={16} /> {new Date(nextSession.dateDebut).toLocaleString("fr-FR")}</span>
                      <Link className="btn btn-primary" href="/participant/classes">Voir mes classes</Link>
                    </div>
                  ) : (
                    <p>Aucune séance à venir ne vous est actuellement affectée.</p>
                  )}
                </Card>
                <Card>
                  <div className="panel-heading"><div><h2>Actions rapides</h2></div></div>
                  <div className="quick-actions">
                    <Link href="/catalogue"><GraduationCap size={18} /> Trouver une formation</Link>
                    <Link href="/participant/classes"><CalendarDays size={18} /> Consulter mes classes</Link>
                    {formations[0] && <Link href={`/apprentissage/${formations[0].formationId}/quiz`}><CheckCircle2 size={18} /> Ouvrir les QCM</Link>}
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : user ? (
          <>
            <PageHeader
              eyebrow="Mon compte"
              title={user.nom}
              description="Consultez les informations associées à votre session."
              actions={<Button variant="secondary" onClick={logout}><LogOut size={17} /> Se déconnecter</Button>}
            />
            <Card className="profile-hero">
              <span className="profile-avatar">{user.nom.slice(0, 1).toUpperCase()}</span>
              <div><h1>{user.nom}</h1><p>{user.email}</p></div>
              <Badge>{user.role}</Badge>
            </Card>
          </>
        ) : null}
      </AppShell>
    </Protected>
  );
}
