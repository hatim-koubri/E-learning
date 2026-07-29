"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {api,currentUser} from "@/lib/api";
import type {CatalogueDetail,ResourceAccess} from "@/lib/learning";

export default function CourseDetail(){
 const id=Number(useParams<{id:string}>().id),router=useRouter();const [course,setCourse]=useState<CatalogueDetail|null>(null),[error,setError]=useState(""),[active,setActive]=useState<ResourceAccess|null>(null);
 const load=useCallback(()=>api<CatalogueDetail>(`/catalogue/${id}`).then(setCourse).catch(e=>setError(e.message)),[id]);useEffect(()=>{load()},[load]);
 async function enroll(){if(!currentUser()){router.push("/login");return}try{await api(`/participant/formations/${id}/inscription`,{method:"POST"});await load()}catch(e){setError((e as Error).message)}}
 async function open(resourceId:number){try{setActive(await api<ResourceAccess>(`/catalogue/${id}/ressources/${resourceId}/acces`))}catch(e){setError(`${(e as Error).message} Le lien a peut-être expiré : réessayez.`)}}
 async function complete(chapterId:number){try{await api(`/participant/formations/${id}/chapitres/${chapterId}/progression`,{method:"PUT",body:JSON.stringify({termine:true,positionVideoSecondes:0})});setError("")}catch(e){setError((e as Error).message)}}
 if(!course)return <main><p>{error||"Chargement…"}</p></main>;
 return <main className="workspace"><section className="wide learning"><Link href="/catalogue">← Catalogue</Link><header className="course-hero"><div><span className="badge">{course.niveau.replaceAll("_"," ")}</span><h1>{course.titre}</h1><p>{course.description}</p><p><b>Formateur :</b> {course.formateur} · <b>Langue :</b> {course.langue}</p><p className="price">{course.prix===0?"Gratuite":`${course.prix} DH`}</p>{!course.inscrit&&<><button onClick={enroll}>{course.prix===0?"S’inscrire gratuitement":"Simuler l’achat"}</button>{course.prix>0&&<p className="muted">Paiement entièrement simulé pour le MVP. Aucune donnée bancaire n’est demandée.</p>}</>}</div>{course.imageUrl&&<Image unoptimized width={480} height={320} className="detail-cover" src={course.imageUrl} alt=""/>}</header>
 {error&&<p className="message error">{error}</p>}{active&&<section className="card panel player"><button className="secondary small" onClick={()=>setActive(null)}>Fermer</button>{active.type==="VIDEO"?<video controls src={active.url}/>:active.type==="PDF"?<iframe title="Document PDF" src={active.url}/>:active.type==="YOUTUBE"?<a target="_blank" rel="noreferrer" href={active.url}>Ouvrir sur YouTube</a>:<Image unoptimized width={900} height={500} src={active.url} alt="Ressource"/>}</section>}
 {course.inscrit&&<p><Link className="button-link" href={`/apprentissage/${id}/quiz`}>Passer les QCM</Link></p>}<h2>Programme · {course.nombreModules} modules, {course.nombreChapitres} chapitres</h2><div className="module-list">{course.modules.map(module=><article className={`module ${module.verrouille?"locked":""}`} key={module.id}><h3>{module.ordre+1}. {module.titre} {module.apercuGratuit&&<span className="badge preview">Aperçu gratuit</span>} {module.verrouille&&<span aria-label="verrouillé">🔒</span>}</h3>{module.chapitres.map(ch=><section className="chapter" key={ch.id}><div className="row spread"><b>{ch.ordre+1}. {ch.titre}</b>{!ch.verrouille&&course.inscrit&&<button className="small" onClick={()=>complete(ch.id)}>Marquer terminé</button>}</div><div className="resource-list">{ch.ressources.map(r=><button className="resource-open" disabled={r.verrouille} onClick={()=>open(r.id)} key={r.id}>{r.type} · {r.titre} {r.verrouille?"🔒":""}</button>)}</div></section>)}</article>)}</div>
 </section></main>
}
