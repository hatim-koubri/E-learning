"use client";

import {CalendarDays, GraduationCap, Star, UsersRound} from "lucide-react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect, useState} from "react";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {Badge, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {InstructorProfile} from "@/lib/engagement";

export default function InstructorPage() {
  const {id} = useParams<{id: string}>();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<InstructorProfile>(`/formateurs/${id}`).then(setProfile).catch((reason) => setError((reason as Error).message)); }, [id]);
  return (
    <div className="instructor-page">
      <PublicHeader />
      <main className="container instructor-content" id="contenu-principal">
        {error ? <ErrorState message={error} /> : !profile ? <Card><Skeleton className="skeleton-cover" /></Card> : (
          <>
            <section className="instructor-hero surface-card">
              <span className="profile-avatar">{profile.nom.slice(0, 1).toUpperCase()}</span>
              <div><span className="eyebrow">Formateur NexaLearn</span><h1>{profile.nom}</h1><p>{profile.specialite || "Spécialité à venir"}</p></div>
              <div className="instructor-stats">
                <span><UsersRound size={18} /><strong>{profile.apprenants}</strong> apprenant(s)</span>
                <span><Star size={18} /><strong>{profile.moyenneAvis || "—"}</strong> moyenne réelle</span>
              </div>
            </section>
            <div className="dashboard-grid">
              <Card><h2>À propos</h2><p>{profile.biographie || "Le formateur n’a pas encore publié sa biographie."}</p></Card>
              <Card><h2>Prochaine classe publique</h2>{profile.prochaineClasse ? <><Badge variant="warning">Planifiée</Badge><h3>{profile.prochaineClasse.titre}</h3><p><CalendarDays size={16} /> {new Date(profile.prochaineClasse.dateDebut).toLocaleString("fr-FR")}</p></> : <p>Aucune classe publique planifiée.</p>}</Card>
            </div>
            <section className="section-space">
              <div className="section-heading"><div><span className="eyebrow">Catalogue du formateur</span><h2>Formations publiées</h2></div></div>
              {profile.formations.length ? <div className="course-grid">{profile.formations.map((course) => <Card key={course.id}><Badge>{course.categorie}</Badge><h2>{course.titre}</h2><p><GraduationCap size={16} /> {course.niveau.toLowerCase()}</p><Link className="btn btn-secondary" href={`/catalogue/${course.id}`}>Voir la formation</Link></Card>)}</div> : <EmptyState title="Aucune formation publiée" description="Les formations apparaîtront après publication." />}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
