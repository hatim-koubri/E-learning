"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  LogOut,
  NotebookPen,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, ProgressBar, Skeleton} from "@/components/ui";
import {api, currentUser, logout, type User} from "@/lib/api";
import {openMeeting, type MeetingAccess} from "@/lib/meeting";
import type {Dashboard, WeeklyGoal} from "@/lib/engagement";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [goalBusy, setGoalBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const sessionUser = currentUser();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const me = await api<User>("/auth/me");
      setUser(me);
      if (me.role === "PARTICIPANT") {
        setDashboard(await api<Dashboard>("/participant/tableau-de-bord"));
        setLoadedAt(Date.now());
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { queueMicrotask(load); }, []);

  async function updateGoal(minutesCible: number) {
    setGoalBusy(true);
    try {
      const goal = await api<WeeklyGoal>("/participant/objectif-hebdomadaire", {
        method: "PUT",
        body: JSON.stringify({
          minutesCible,
          fuseauHoraire: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca",
        }),
      });
      setDashboard((current) => current ? {...current, objectifHebdomadaire: goal} : current);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function joinDashboardSession(sessionId: number) {
    try {
      const access = await api<MeetingAccess>(`/participant/seances/${sessionId}/join`);
      openMeeting(access, "/profile");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const role = user?.role ?? sessionUser?.role ?? "PARTICIPANT";
  const stage = dashboard ? Math.min(4, Math.floor(dashboard.progressionGlobale / 25)) : 0;
  const nextFormation = dashboard?.formations[0];

  return (
    <Protected>
      <AppShell role={role}>
        {loading ? (
          <div className="stack" role="status"><Skeleton className="skeleton-line medium" /><Skeleton className="skeleton-cover" /></div>
        ) : error && !user ? (
          <ErrorState message={error} onRetry={load} />
        ) : user?.role === "PARTICIPANT" && error && !dashboard ? (
          <>
            <PageHeader
              eyebrow="Aujourd’hui"
              title={`Bonjour, ${user.nom}`}
              description="Votre tableau de bord n’a pas pu être chargé."
            />
            <ErrorState
              title="Tableau de bord momentanément indisponible"
              message={error}
              onRetry={load}
            />
          </>
        ) : user?.role === "PARTICIPANT" && dashboard ? (
          <>
            <PageHeader
              eyebrow="Aujourd’hui"
              title={`Bonjour, ${user.nom}`}
              description={dashboard.prochaineAction}
              actions={
                <>
                  <Link className="btn btn-secondary" href="/notifications"><Bell size={17} /> Notifications</Link>
                  <Button variant="ghost" onClick={logout}><LogOut size={17} /> Déconnexion</Button>
                </>
              }
            />
            {error && <div className="profile-inline-error"><ErrorState message={error} onRetry={load} /></div>}
            <Card className="today-card">
              <div className="today-copy">
                <span className="eyebrow">Votre prochaine étape</span>
                {dashboard.reprise ? (
                  <>
                    <h2>{dashboard.reprise.chapitreTitre || dashboard.reprise.formationTitre}</h2>
                    <p>{dashboard.reprise.formationTitre}{dashboard.reprise.moduleTitre ? ` · ${dashboard.reprise.moduleTitre}` : ""}</p>
                    <Link className="btn btn-primary" href={dashboard.reprise.href}>
                      Reprendre là où j’en étais <ArrowRight size={17} />
                    </Link>
                  </>
                ) : nextFormation ? (
                  <>
                    <h2>Commencer {nextFormation.titre}</h2>
                    <p>Votre parcours est prêt. Ouvrez la première ressource disponible pour enregistrer votre point de reprise.</p>
                    <Link className="btn btn-primary" href={`/apprentissage/${nextFormation.formationId}`}>
                      Ouvrir le parcours <ArrowRight size={17} />
                    </Link>
                  </>
                ) : (
                  <>
                    <h2>Choisissez votre première étape</h2>
                    <p>Explorez le catalogue et inscrivez-vous à un parcours publié pour commencer.</p>
                    <Link className="btn btn-primary" href="/catalogue">Explorer le catalogue</Link>
                  </>
                )}
              </div>
              <div className="today-path"><KnowledgePath active={stage} compact /></div>
            </Card>

            <div className="stats-grid">
              <Card className="stat-card"><span className="stat-icon"><BookOpen size={21} /></span><div><small>Formations</small><strong>{dashboard.formations.length}</strong></div></Card>
              <Card className="stat-card"><span className="stat-icon success"><TrendingUp size={21} /></span><div><small>Progression globale</small><strong>{dashboard.progressionGlobale}%</strong></div></Card>
              <Card className="stat-card"><span className="stat-icon warning"><CheckCircle2 size={21} /></span><div><small>Quiz disponibles</small><strong>{dashboard.quizDisponibles}</strong></div></Card>
              <Card className="stat-card"><span className="stat-icon"><Heart size={21} /></span><div><small>Favoris</small><strong>{dashboard.favoris.length}</strong></div></Card>
            </div>

            <div className="dashboard-grid">
              <div className="stack">
                <Card>
                  <div className="panel-heading">
                    <div><h2>Objectif hebdomadaire</h2><p>{dashboard.objectifHebdomadaire.message}</p></div>
                    <Target size={23} />
                  </div>
                  <ProgressBar
                    value={dashboard.objectifHebdomadaire.pourcentage}
                    label={`${dashboard.objectifHebdomadaire.minutesValidees} sur ${dashboard.objectifHebdomadaire.minutesCible} minutes validées`}
                  />
                  <div className="goal-meta">
                    <span><Clock3 size={16} /> {dashboard.objectifHebdomadaire.activitesValidees} activité(s) significative(s)</span>
                    <span>{dashboard.objectifHebdomadaire.semainesRegulieres} semaine(s) régulière(s)</span>
                  </div>
                  <label className="goal-select">
                    Ajuster mon objectif
                    <select
                      disabled={goalBusy}
                      value={dashboard.objectifHebdomadaire.minutesCible}
                      onChange={(event) => updateGoal(Number(event.target.value))}
                    >
                      <option value={30}>30 minutes</option><option value={60}>1 heure</option>
                      <option value={120}>2 heures</option><option value={180}>3 heures</option>
                    </select>
                  </label>
                </Card>
                <Card>
                  <div className="panel-heading"><div><h2>Mes apprentissages</h2><p>Progression calculée à partir des chapitres terminés.</p></div></div>
                  {dashboard.formations.length ? (
                    <div className="learning-list">
                      {dashboard.formations.map((formation) => (
                        <article className="learning-row" key={formation.formationId}>
                          <div><h3>{formation.titre}</h3><p>{formation.typeAcces === "CONTENU_ET_CLASSES" ? "Contenu et classes" : "Contenu"}</p></div>
                          <ProgressBar value={Number(formation.progression)} />
                          <Link className="btn btn-secondary" href={`/apprentissage/${formation.formationId}`}>
                            Ouvrir le parcours <ArrowRight size={16} />
                          </Link>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Aucun apprentissage en cours" description="Explorez une formation publiée pour commencer." action={<Link className="btn btn-primary" href="/catalogue">Explorer</Link>} />
                  )}
                </Card>
                <Card>
                  <div className="panel-heading"><div><h2>Recommandations expliquées</h2><p>Des règles simples fondées sur vos choix et votre historique.</p></div></div>
                  {dashboard.recommandations.length ? (
                    <div className="recommendation-list">
                      {dashboard.recommandations.slice(0, 4).map((item) => (
                        <article key={item.formationId}>
                          <div><Badge variant="primary">{item.categorie}</Badge><h3>{item.titre}</h3><p>{item.raisons.join(" · ")}</p></div>
                          <Link className="btn btn-secondary" href={`/catalogue/${item.formationId}`}>Découvrir</Link>
                        </article>
                      ))}
                    </div>
                  ) : <p>Complétez vos préférences pour recevoir des suggestions pertinentes.</p>}
                </Card>
              </div>
              <div className="stack">
                <Card>
                  <div className="panel-heading"><div><h2>Prochaine classe</h2><p>Uniquement les séances auxquelles vous êtes affecté.</p></div><CalendarDays size={22} /></div>
                  {dashboard.prochaineClasse ? (
                    <div className="stack">
                      <Badge variant={loadedAt !== null && new Date(dashboard.prochaineClasse.dateDebut).getTime() <= loadedAt ? "live" : "warning"}>{loadedAt !== null && new Date(dashboard.prochaineClasse.dateDebut).getTime() <= loadedAt ? "En direct" : "Planifiée"}</Badge>
                      <strong>{dashboard.prochaineClasse.titre}</strong>
                      <p>{dashboard.prochaineClasse.formation}</p>
                      <span className="session-date"><CalendarDays size={16} /> {new Date(dashboard.prochaineClasse.dateDebut).toLocaleString("fr-FR")}</span>
                      {loadedAt !== null && new Date(dashboard.prochaineClasse.dateDebut).getTime() <= loadedAt && new Date(dashboard.prochaineClasse.dateFin).getTime() > loadedAt ? (
                        <Button disabled={!dashboard.prochaineClasse.hostReady} onClick={() => joinDashboardSession(dashboard.prochaineClasse!.id)}><Video size={17}/>{dashboard.prochaineClasse.hostReady ? "Rejoindre la séance" : "En attente du formateur"}</Button>
                      ) : <Link className="btn btn-primary" href="/participant/classes">Voir mes classes</Link>}
                    </div>
                  ) : <p>Aucune séance à venir ne vous est actuellement affectée.</p>}
                </Card>
                <Card>
                  <div className="panel-heading"><div><h2>Favoris</h2></div><Heart size={21} /></div>
                  {dashboard.favoris.length ? (
                    <div className="compact-list">
                      {dashboard.favoris.slice(0, 4).map((item) => <Link href={`/catalogue/${item.formationId}`} key={item.id}>{item.titre}<ArrowRight size={15} /></Link>)}
                    </div>
                  ) : <p>Ajoutez des formations depuis le catalogue pour les retrouver ici.</p>}
                </Card>
                <Card>
                  <div className="panel-heading"><div><h2>Activité récente</h2></div></div>
                  {dashboard.activiteRecente.length ? (
                    <ol className="activity-list">
                      {dashboard.activiteRecente.slice(0, 6).map((item, index) => (
                        <li key={`${item.occurredAt}-${index}`}><span /><div><strong>{item.type.toLowerCase().replaceAll("_", " ")}</strong><small>{item.formation || "Activité pédagogique"} · {new Date(item.occurredAt).toLocaleDateString("fr-FR")}</small></div></li>
                      ))}
                    </ol>
                  ) : <p>Votre activité apparaîtra après un chapitre, une ressource, un quiz ou une classe validée.</p>}
                </Card>
                <Card>
                  <div className="quick-actions">
                    <Link href="/participant/notes"><NotebookPen size={18} /> Mes notes et signets</Link>
                    <Link href="/catalogue?favoris=1"><BookMarked size={18} /> Mes formations favorites</Link>
                    <Link href="/participant/onboarding"><SlidersHorizontal size={18} /> Modifier mes préférences</Link>
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : user ? (
          <>
            <PageHeader eyebrow="Mon compte" title={user.nom} description="Consultez les informations associées à votre session." actions={<Button variant="secondary" onClick={logout}><LogOut size={17} /> Se déconnecter</Button>} />
            <Card className="profile-hero"><span className="profile-avatar">{user.nom.slice(0, 1).toUpperCase()}</span><div><h1>{user.nom}</h1><p>{user.email}</p></div><Badge>{user.role}</Badge></Card>
          </>
        ) : null}
      </AppShell>
    </Protected>
  );
}
