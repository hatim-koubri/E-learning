"use client";

import {ArrowLeft, BookOpen, Check, LockKeyhole, NotebookPen, Play, Route} from "lucide-react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Card, ErrorState, ProgressBar, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {LearningJourney} from "@/lib/engagement";

function StateIcon({state}: {state: string}) {
  if (state === "TERMINE") return <Check size={17} />;
  if (state === "VERROUILLE") return <LockKeyhole size={16} />;
  return <Play size={16} />;
}

export default function LearningJourneyPage() {
  const {formationId} = useParams<{formationId: string}>();
  const [journey, setJourney] = useState<LearningJourney | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setJourney(await api<LearningJourney>(`/participant/formations/${formationId}/parcours`)); }
    catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }, [formationId]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  return (
    <Protected role="PARTICIPANT">
      <AppShell role="PARTICIPANT">
        <PageHeader
          eyebrow="Carte d’apprentissage"
          title={journey?.titre || "Votre parcours"}
          description="Les étapes sont déverrouillées par vos vrais prérequis. La liste située sous la carte offre la même navigation au clavier."
          breadcrumb={[{label: "Tableau de bord", href: "/profile"}, {label: "Parcours"}]}
          actions={<Link className="btn btn-secondary" href={`/catalogue/${formationId}`}><ArrowLeft size={17} /> Ouvrir le cours</Link>}
        />
        {loading && <Card><Skeleton className="skeleton-cover" /></Card>}
        {error && <ErrorState message={error} onRetry={load} />}
        {journey && (
          <>
            <Card className="journey-overview">
              <div><Route size={24} /><h2>{journey.progression}% du cours terminé</h2></div>
              <ProgressBar value={journey.progression} />
              <KnowledgePath active={Math.min(4, Math.floor(journey.progression / 25))} compact />
            </Card>
            <section className="course-map" aria-label="Carte interactive du cours">
              {journey.modules.map((module, moduleIndex) => (
                <article className={`map-module ${module.etat.toLowerCase()}`} key={module.id}>
                  <header>
                    <span className="map-module-number">{String(moduleIndex + 1).padStart(2, "0")}</span>
                    <div><Badge>{module.etat.toLowerCase()}</Badge><h2>{module.titre}</h2><ProgressBar value={module.progression} /></div>
                  </header>
                  <ol>
                    {module.chapitres.map((chapter) => (
                      <li className={chapter.etat.toLowerCase()} key={chapter.id}>
                        <span className="map-node"><StateIcon state={chapter.etat} /></span>
                        <div><strong>{chapter.titre}</strong><small>{chapter.progression}% terminé</small></div>
                        {chapter.etat !== "VERROUILLE" && <Link href={`/catalogue/${formationId}?chapitre=${chapter.id}`}>Ouvrir</Link>}
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </section>
            <details className="accessible-journey surface-card">
              <summary><BookOpen size={18} /> Alternative accessible sous forme de liste</summary>
              {journey.modules.map((module) => (
                <section key={module.id}><h2>{module.titre}</h2><ul>{module.chapitres.map((chapter) => <li key={chapter.id}>{chapter.titre} — {chapter.etat.toLowerCase()}</li>)}</ul></section>
              ))}
            </details>
            <Card className="journey-notes-cta">
              <NotebookPen size={24} />
              <div><h2>Une idée à retenir ?</h2><p>Vos notes et signets restent privés et regroupés dans votre bibliothèque.</p></div>
              <Link className="btn btn-secondary" href="/participant/notes">Voir mes notes</Link>
            </Card>
          </>
        )}
      </AppShell>
    </Protected>
  );
}
