"use client";

import Link from "next/link";
import {ArrowRight,CalendarDays,ImageIcon,Plus} from "lucide-react";
import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import {AppShell} from "@/components/AppShell";
import {FormationFields,formationPayload} from "@/components/FormationFields";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge,Button,ConfirmDialog,EmptyState,ErrorState,Modal,PageSkeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {FormationDetail,FormationSummary} from "@/lib/formations";

export default function FormationsPage(){
  const [items,setItems]=useState<FormationSummary[]>([]),[error,setError]=useState(""),[creating,setCreating]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [archiveTarget,setArchiveTarget]=useState<FormationSummary|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{setItems(await api<FormationSummary[]>("/formateur/formations"));setError("")}catch(reason){setError((reason as Error).message)}finally{setLoading(false)}},[]);
  useEffect(()=>{queueMicrotask(()=>void load())},[load]);
  async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();setSaving(true);setError("");try{const formation=await api<FormationDetail>("/formateur/formations",{method:"POST",body:JSON.stringify(formationPayload(event.currentTarget))});location.href=`/formateur/formations/${formation.id}`}catch(reason){setError((reason as Error).message)}finally{setSaving(false)}}
  async function archive(){if(!archiveTarget)return;setSaving(true);try{await api(`/formateur/formations/${archiveTarget.id}/statut`,{method:"PUT",body:JSON.stringify({statut:"ARCHIVEE"})});setArchiveTarget(null);await load()}catch(reason){setError((reason as Error).message)}finally{setSaving(false)}}
  const groups=useMemo(()=>({action:items.filter(item=>item.statut==="BROUILLON"||item.statut==="DEPUBLIEE"),published:items.filter(item=>item.statut==="PUBLIEE"),archived:items.filter(item=>item.statut==="ARCHIVEE")}),[items]);
  return <Protected role="FORMATEUR"><AppShell role="FORMATEUR">
    <PageHeader eyebrow="Atelier pédagogique" title="Mes formations" description="Concevez chaque parcours, vérifiez son programme puis accompagnez sa publication." actions={<><Link className="btn btn-secondary" href="/formateur/classes"><CalendarDays size={17}/> Classes</Link><Button onClick={()=>setCreating(true)}><Plus size={18}/> Nouvelle formation</Button></>}/>
    {error&&<ErrorState message={error} onRetry={load}/>}
    {loading?<PageSkeleton/>:items.length?<div className="trainer-course-groups">
      {([['action','À poursuivre','Les parcours qui demandent encore une action.'],['published','Publiées','Les formations visibles par les participants.'],['archived','Archivées','Les parcours retirés du catalogue.']] as const).map(([key,title,description])=>groups[key].length>0&&<section className="trainer-course-section" key={key} aria-labelledby={`formation-group-${key}`}>
        <div className="section-heading compact-heading"><div><h2 id={`formation-group-${key}`}>{title}</h2><p>{description}</p></div><Badge>{groups[key].length}</Badge></div>
        <div className="course-grid">{groups[key].map(item=><article className="course-card trainer-course-card" key={item.id}>
          <TrainerCover formation={item}/><div className="course-body"><div className="row spread"><Badge variant={item.statut==="PUBLIEE"?"success":item.statut==="ARCHIVEE"?"neutral":"warning"}>{statusLabel(item.statut)}</Badge><span className="muted">{item.nombreModules} module(s)</span></div><span className="course-category">{item.categorie}</span><h3>{item.titre}</h3><p>{item.description}</p>
          <div className="course-meta" aria-label="Détails de l’offre"><span>{item.niveau.replaceAll("_"," ")}</span><span>{item.prix===0?"Gratuite":`${item.prix} DH`}</span><span>{item.classesGratuites?"Classes incluses":Number(item.supplementClasses)>0?`Classes +${item.supplementClasses} DH`:"Parcours autonome"}</span></div>
          <div className="completion-check" aria-label="État de complétude"><strong>Checklist transparente</strong><span>{item.imageCouvertureKey?"✓":"○"} Couverture</span><span>{item.nombreModules>0?"✓":"○"} Programme commencé</span></div>
          <div className="course-card-footer"><Link className="btn btn-primary" href={item.statut==="PUBLIEE"?`/catalogue/${item.id}`:`/formateur/formations/${item.id}`}>{item.statut==="PUBLIEE"?"Voir la version publiée":item.statut==="BROUILLON"?"Continuer la conception":"Gérer"}<ArrowRight size={16}/></Link><div className="secondary-actions"><Link className="btn btn-secondary btn-sm" href={`/formateur/formations/${item.id}`}>Éditer</Link>{item.statut!=="ARCHIVEE"&&<Button size="sm" variant="ghost" onClick={()=>setArchiveTarget(item)}>Archiver</Button>}</div></div>
        </div></article>)}</div>
      </section>)}
    </div>:!error?<EmptyState title="Votre première formation commence ici" description="Créez un brouillon, puis ajoutez vos modules, chapitres et ressources." action={<Button onClick={()=>setCreating(true)}><Plus size={17}/> Créer mon premier cours</Button>}/>:null}
    <Modal open={creating} title="Nouvelle formation" description="Commencez par les informations générales. Vous structurerez le programme à l’étape suivante." onClose={()=>setCreating(false)}><form className="stack" onSubmit={create}><FormationFields/>{error&&<p className="message error">{error}</p>}<div className="form-actions"><Button type="button" variant="secondary" onClick={()=>setCreating(false)}>Fermer</Button><Button type="submit" loading={saving}>Créer et structurer</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(archiveTarget)} title="Archiver cette formation ?" description={`« ${archiveTarget?.titre??""} » disparaîtra du catalogue. Les accès déjà acquis restent conservés.`} confirmLabel="Archiver" danger busy={saving} onCancel={()=>setArchiveTarget(null)} onConfirm={archive}/>
  </AppShell></Protected>;
}

function statusLabel(status:string){return status==="PUBLIEE"?"Publiée":status==="BROUILLON"?"Brouillon":status==="DEPUBLIEE"?"Dépubliée":"Archivée"}
function TrainerCover({formation}:{formation:FormationSummary}){
  const [url,setUrl]=useState("");
  useEffect(()=>{if(!formation.imageCouvertureKey)return;let active=true;api<{url:string}>(`/formateur/formations/${formation.id}/couverture-acces`).then(value=>{if(active)setUrl(value.url)}).catch(()=>{});return()=>{active=false}},[formation.id,formation.imageCouvertureKey]);
  return <div className="course-cover">{url?<>
    {/* URL MinIO signée: son hôte ne peut pas être configuré statiquement dans next/image. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={url} alt={`Couverture de ${formation.titre}`}/>
  </>:<><ImageIcon aria-hidden="true" size={34}/><span>Couverture à ajouter</span></>}</div>;
}
