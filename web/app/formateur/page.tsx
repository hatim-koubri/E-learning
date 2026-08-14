"use client";

import {ArrowRight, CalendarDays, Clock3, GraduationCap, MessageSquareReply, UsersRound, Video} from "lucide-react";
import Link from "next/link";
import {useEffect, useMemo, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api} from "@/lib/api";
import {openMeeting, type MeetingAccess} from "@/lib/meeting";
import type {Classe, Session} from "@/lib/classes";
import type {Review} from "@/lib/engagement";
import type {FormationSummary} from "@/lib/formations";

type TrainerEngagement = {inscriptions:number;avisPublies:number;moyenneAvis:number;avis:Review[]};
type DashboardData = {formations:FormationSummary[];classes:Classe[];engagement:TrainerEngagement;loadedAt:number};

export default function TrainerDashboard() {
  const [data,setData]=useState<DashboardData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  async function load() {
    setLoading(true);setError("");
    try {
      const [formations,classes,engagement]=await Promise.all([
        api<FormationSummary[]>("/formateur/formations"),
        api<Classe[]>("/formateur/classes"),
        api<TrainerEngagement>("/formateur/engagement"),
      ]);
      setData({formations,classes,engagement,loadedAt:Date.now()});
    } catch(reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(()=>{queueMicrotask(()=>void load());},[]);

  async function joinSession(id:number) {
    try {
      const access=await api<MeetingAccess>(`/formateur/seances/${id}/join`);
      openMeeting(access,"/formateur");
    } catch(reason) { setError((reason as Error).message); }
  }

  const summary=useMemo(()=>{
    if(!data)return null;
    const now=data.loadedAt;
    const drafts=data.formations.filter(item=>item.statut==="BROUILLON"||item.statut==="DEPUBLIEE");
    const published=data.formations.filter(item=>item.statut==="PUBLIEE");
    const upcoming=data.classes.flatMap(classe=>classe.seances.map(session=>({classe,session})))
      .filter(item=>item.session.statut==="PLANIFIEE"&&new Date(item.session.dateFin).getTime()>now)
      .sort((a,b)=>new Date(a.session.dateDebut).getTime()-new Date(b.session.dateDebut).getTime());
    const unanswered=data.engagement.avis.filter(item=>!item.reponseFormateur);
    return {drafts,published,upcoming,unanswered};
  },[data]);

  return <Protected role="FORMATEUR"><AppShell role="FORMATEUR">
    <PageHeader eyebrow="Espace formateur" title="Tableau de bord" description="Pilotez vos formations, vos prochaines séances et le suivi des participants depuis un seul espace." actions={<Link className="btn btn-primary" href="/formateur/formations"><GraduationCap size={17}/> Gérer mes formations</Link>}/>
    {error&&<ErrorState message={error} onRetry={load}/>}
    {loading?<TrainerDashboardSkeleton/>:data&&summary&&<>
      <section className="trainer-kpis" aria-label="Indicateurs réels">
        <Metric label="Formations publiées" value={summary.published.length} context={`${data.formations.length} formation(s) au total`} icon={<GraduationCap/>}/>
        <Metric label="Participants inscrits" value={data.engagement.inscriptions} context="Toutes vos formations" icon={<UsersRound/>}/>
        <Metric label="Séances à venir" value={summary.upcoming.length} context={`${data.classes.length} classe(s) gérée(s)`} icon={<CalendarDays/>}/>
        <Metric label="Avis publiés" value={data.engagement.avisPublies} context={data.engagement.avisPublies?`Moyenne ${data.engagement.moyenneAvis}/5`:"Aucun avis publié"} icon={<MessageSquareReply/>}/>
      </section>

      <section className="teaching-priorities" aria-labelledby="teaching-priorities-title">
        <div className="priority-heading"><div><span className="eyebrow">À traiter maintenant</span><h2 id="teaching-priorities-title">Priorités pédagogiques</h2><p>Une lecture directe des actions réellement disponibles dans votre espace.</p></div><Badge variant={summary.drafts.length+summary.unanswered.length?"warning":"success"}>{summary.drafts.length+summary.unanswered.length?`${summary.drafts.length+summary.unanswered.length} action(s)`:"À jour"}</Badge></div>
        <div className="priority-columns">
          <Priority title="Conception" count={summary.drafts.length} description="Formation(s) à poursuivre ou republier" href="/formateur/formations" icon={<GraduationCap/>}/>
          <Priority title="Prochaine séance" count={summary.upcoming.length} description={summary.upcoming[0]?formatSession(summary.upcoming[0].session):"Aucune séance planifiée"} href="/formateur/classes" icon={<Clock3/>}/>
          <Priority title="Suivi participants" count={summary.unanswered.length} description="Avis publié(s) sans réponse" href="/formateur/engagement" icon={<MessageSquareReply/>}/>
        </div>
      </section>

      <div className="trainer-dashboard-grid">
        <Card className="trainer-next-sessions"><div className="panel-heading"><div><span className="resource-kicker">Agenda réel</span><h2>Prochaines séances</h2></div><Link className="text-link" href="/formateur/classes">Toutes les classes</Link></div>
          {summary.upcoming.length?<div className="dashboard-session-list">{summary.upcoming.slice(0,4).map(({classe,session})=>{const live=new Date(session.dateDebut).getTime()<=Date.now()&&new Date(session.dateFin).getTime()>Date.now();return <article key={session.id}><time dateTime={session.dateDebut}>{new Date(session.dateDebut).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</time><div><h3>{session.titre}</h3><p>{classe.nom} · {classe.formation}</p><span>{new Date(session.dateDebut).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · {session.fuseauHoraire}</span></div>{live&&<Button size="sm" onClick={()=>joinSession(session.id)}><Video size={16}/> Ouvrir</Button>}</article>})}</div>:<EmptyState title="Agenda dégagé" description="Aucune séance future n’est planifiée. Vous pouvez en créer depuis vos classes." action={<Link className="btn btn-secondary" href="/formateur/classes">Planifier une séance</Link>}/>}
        </Card>
        <Card className="trainer-course-overview"><div className="panel-heading"><div><span className="resource-kicker">Portefeuille pédagogique</span><h2>État des formations</h2></div></div>
          {data.formations.length?<div className="formation-status-list">{["PUBLIEE","BROUILLON","DEPUBLIEE","ARCHIVEE"].map(status=>{const count=data.formations.filter(item=>item.statut===status).length;return <div key={status}><span>{statusLabel(status)}</span><strong>{count}</strong></div>})}</div>:<EmptyState title="Aucune formation" description="Créez votre première formation pour commencer à construire votre offre pédagogique." action={<Link className="btn btn-primary" href="/formateur/formations">Créer une formation</Link>}/>}
        </Card>
      </div>
    </>}
  </AppShell></Protected>;
}

function Metric({label,value,context,icon}:{label:string;value:number;context:string;icon:React.ReactNode}){return <Card className="trainer-metric"><span className="metric-icon">{icon}</span><span className="resource-kicker">{label}</span><strong>{value}</strong><p>{context}</p></Card>}
function Priority({title,count,description,href,icon}:{title:string;count:number;description:string;href:string;icon:React.ReactNode}){return <article><span className="priority-icon">{icon}</span><div><span>{title}</span><strong>{count}</strong><p>{description}</p></div><Link aria-label={`Ouvrir ${title}`} href={href}><ArrowRight/></Link></article>}
function TrainerDashboardSkeleton(){return <><div className="trainer-kpis">{[0,1,2,3].map(item=><Card className="trainer-metric" key={item}><Skeleton className="skeleton-line short"/><Skeleton className="skeleton-line medium"/><Skeleton className="skeleton-line long"/></Card>)}</div><Card><Skeleton className="skeleton-line medium"/><Skeleton className="skeleton-cover"/></Card></>}
function formatSession(session:Session){return new Date(session.dateDebut).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function statusLabel(status:string){return ({PUBLIEE:"Publiées",BROUILLON:"Brouillons",DEPUBLIEE:"Dépubliées",ARCHIVEE:"Archivées"} as Record<string,string>)[status]??status}
