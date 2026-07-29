"use client";
import Link from "next/link";
import Image from "next/image";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {api} from "@/lib/api";
import type {CataloguePage} from "@/lib/learning";

export default function Catalogue(){
 const [data,setData]=useState<CataloguePage|null>(null),[q,setQ]=useState(""),[page,setPage]=useState(0),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{setLoading(true);setError("");try{setData(await api<CataloguePage>(`/catalogue?q=${encodeURIComponent(q)}&page=${page}&size=9`))}catch(e){setError((e as Error).message)}finally{setLoading(false)}},[q,page]);
 // The request intentionally drives the loading state for every search/page transition.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{load()},[load]);
 function search(e:FormEvent){e.preventDefault();setPage(0);load()}
 return <main className="workspace"><section className="wide dashboard">
  <header className="page-header"><div><span className="eyebrow">Apprendre à votre rythme</span><h1>Catalogue des formations</h1><p className="muted">Explorez les formations publiées et testez gratuitement leur premier module.</p></div><Link href="/login">Se connecter</Link></header>
  <form className="catalog-search" onSubmit={search}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Titre, catégorie ou mot-clé"/><button>Rechercher</button></form>
  {loading&&<div className="empty">Chargement du catalogue…</div>}{error&&<p className="message error">{error}</p>}
  {!loading&&data&&<><div className="course-grid">{data.content.map(item=><article className="course-card" key={item.id}>
   <div className="course-cover">{item.imageUrl?<Image unoptimized width={420} height={170} src={item.imageUrl} alt="" />:<span>Formation</span>}</div>
   <div className="course-body"><div className="row spread"><span className="badge">{item.niveau.replaceAll("_"," ")}</span><span>{item.prix===0?"Gratuite":`${item.prix} DH`}</span></div><h2>{item.titre}</h2><p>{item.description}</p><p className="muted">Par {item.formateur} · {item.nombreModules} modules · {item.nombreChapitres} chapitres</p><Link className="button-link" href={`/catalogue/${item.id}`}>Voir la formation</Link></div>
  </article>)}</div>{!data.content.length&&<div className="empty"><h2>Aucun résultat</h2><p>Essayez une autre recherche.</p></div>}
  <nav className="pagination"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Précédent</button><span>Page {page+1} sur {Math.max(data.totalPages,1)}</span><button disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Suivant</button></nav></>}
 </section></main>
}
