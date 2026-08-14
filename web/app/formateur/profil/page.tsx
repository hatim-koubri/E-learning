"use client";

import {GraduationCap, Star, UsersRound} from "lucide-react";
import Link from "next/link";
import {useEffect,useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge,Card,EmptyState,ErrorState,Skeleton} from "@/components/ui";
import {api,currentUser} from "@/lib/api";
import type {InstructorProfile} from "@/lib/engagement";

export default function TrainerPublicProfile(){
  const [profile,setProfile]=useState<InstructorProfile|null>(null),[error,setError]=useState("");
  async function load(){const id=currentUser()?.id;if(!id)return;setError("");try{setProfile(await api<InstructorProfile>(`/formateurs/${id}`))}catch(reason){setError((reason as Error).message)}}
  useEffect(()=>{queueMicrotask(()=>void load())},[]);
  return <Protected role="FORMATEUR"><AppShell role="FORMATEUR">
    <PageHeader eyebrow="Votre vitrine pédagogique" title="Profil public" description="Prévisualisez ce que les participants voient, tout en restant dans votre espace formateur." actions={<Link className="btn btn-secondary" href="/formateur/engagement">Modifier le profil</Link>}/>
    {error?<ErrorState message={error} onRetry={load}/>:!profile?<Card><Skeleton className="skeleton-cover"/></Card>:<>
      <section className="instructor-hero surface-card"><span className="profile-avatar">{profile.nom.slice(0,1).toUpperCase()}</span><div><span className="eyebrow">Formateur NexaLearn</span><h1>{profile.nom}</h1><p>{profile.specialite||"Spécialité à renseigner"}</p></div><div className="instructor-stats"><span><UsersRound size={18}/><strong>{profile.apprenants}</strong> apprenant(s)</span><span><Star size={18}/><strong>{profile.moyenneAvis||"—"}</strong> moyenne réelle</span></div></section>
      <Card className="section-space"><h2>À propos</h2><p>{profile.biographie||"Votre biographie n’est pas encore publiée."}</p></Card>
      <section className="section-space"><div className="section-heading"><div><span className="eyebrow">Offre visible</span><h2>Formations publiées</h2></div></div>{profile.formations.length?<div className="course-grid">{profile.formations.map(course=><Card key={course.id}><Badge>{course.categorie}</Badge><h2>{course.titre}</h2><p><GraduationCap size={16}/> {course.niveau.toLowerCase()}</p><Link className="btn btn-secondary" href={`/catalogue/${course.id}`}>Voir la formation</Link></Card>)}</div>:<EmptyState title="Aucune formation publiée" description="Vos formations apparaîtront ici après publication."/>}</section>
    </>}
  </AppShell></Protected>
}
