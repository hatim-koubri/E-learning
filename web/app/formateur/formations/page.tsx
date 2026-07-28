"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {FormationFields,formationPayload} from "@/components/FormationFields";
import {api,logout} from "@/lib/api";
import {FormationDetail,FormationSummary} from "@/lib/formations";

export default function FormationsPage(){
  const [items,setItems]=useState<FormationSummary[]>([]),[error,setError]=useState(""),[creating,setCreating]=useState(false);
  const load=useCallback(()=>api<FormationSummary[]>("/formateur/formations").then(setItems).catch(e=>setError(e.message)),[]);
  useEffect(()=>{load()},[load]);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setError("");
    try{
      const formation=await api<FormationDetail>("/formateur/formations",{method:"POST",body:JSON.stringify(formationPayload(event.currentTarget))});
      location.href=`/formateur/formations/${formation.id}`;
    }catch(e){setError((e as Error).message)}
  }
  return <Protected role="FORMATEUR"><main className="workspace"><section className="wide dashboard">
    <header className="page-header"><div><span className="eyebrow">Espace formateur</span><h1>Mes formations</h1><p className="muted">Créez votre parcours, puis organisez ses modules et ressources.</p></div>
      <div className="row"><button onClick={()=>setCreating(v=>!v)}>{creating?"Fermer":"Nouvelle formation"}</button><button className="secondary" onClick={logout}>Déconnexion</button></div></header>
    {error&&<p className="message error">{error}</p>}
    {creating&&<form className="card editor-form stack" onSubmit={create}><h2>Nouvelle formation</h2><FormationFields/><button>Créer et structurer</button></form>}
    <div className="course-grid">{items.map(item=><article className="course-card" key={item.id}>
      <div className="course-cover">{item.imageCouvertureKey?<span>Image configurée</span>:<span>Ajoutez une couverture</span>}</div>
      <div className="course-body"><div className="row spread"><span className="badge">{item.statut}</span><span className="muted">{item.nombreModules} module(s)</span></div>
        <h2>{item.titre}</h2><p>{item.description}</p><p className="muted">{item.categorie} · {item.niveau.replaceAll("_"," ")} · {item.prix} MAD</p>
        <Link className="button-link" href={`/formateur/formations/${item.id}`}>Ouvrir l’éditeur</Link></div>
    </article>)}</div>
    {!items.length&&!creating&&<div className="empty"><h2>Votre première formation commence ici</h2><p className="muted">Créez un brouillon, puis ajoutez votre programme.</p></div>}
  </section></main></Protected>
}
