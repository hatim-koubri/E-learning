"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {Protected} from "@/components/Protected";
import {FormationFields,formationPayload} from "@/components/FormationFields";
import {api} from "@/lib/api";
import {Chapitre,formatBytes,FormationDetail,FormationModule,ResourceType,Ressource} from "@/lib/formations";

export default function FormationEditor(){
  const id=Number(useParams<{id:string}>().id);
  const [formation,setFormation]=useState<FormationDetail|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(()=>api<FormationDetail>(`/formateur/formations/${id}`).then(setFormation).catch(e=>setError(e.message)),[id]);
  useEffect(()=>{load()},[load]);
  async function run(action:()=>Promise<unknown>,message="Modification enregistrée"){
    setError("");setNotice("");
    try{await action();await load();setNotice(message)}catch(e){setError((e as Error).message)}
  }
  async function updateFormation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();await run(()=>api(`/formateur/formations/${id}`,{method:"PUT",body:JSON.stringify(formationPayload(event.currentTarget))}));
  }
  async function uploadCover(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const data=new FormData(event.currentTarget);
    await run(()=>api(`/formateur/formations/${id}/couverture`,{method:"POST",body:data}),"Couverture envoyée");
  }
  async function addModule(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await run(()=>api(`/formateur/formations/${id}/modules`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),description:data.get("description"),apercuGratuit:data.get("apercu")==="on"})}),"Module ajouté");form.reset();
  }
  async function editModule(module:FormationModule){
    const titre=prompt("Titre du module",module.titre);if(!titre)return;
    const description=prompt("Description du module",module.description??"")??module.description??"";
    await run(()=>api(`/formateur/modules/${module.id}`,{method:"PUT",body:JSON.stringify({titre,description,apercuGratuit:module.apercuGratuit})}));
  }
  async function togglePreview(module:FormationModule){
    await run(()=>api(`/formateur/modules/${module.id}`,{method:"PUT",body:JSON.stringify({titre:module.titre,description:module.description??"",apercuGratuit:!module.apercuGratuit})}));
  }
  async function addChapter(event:FormEvent<HTMLFormElement>,moduleId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await run(()=>api(`/formateur/modules/${moduleId}/chapitres`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),description:data.get("description")})}),"Chapitre ajouté");form.reset();
  }
  async function editChapter(chapter:Chapitre){
    const titre=prompt("Titre du chapitre",chapter.titre);if(!titre)return;
    const description=prompt("Description du chapitre",chapter.description??"")??chapter.description??"";
    await run(()=>api(`/formateur/chapitres/${chapter.id}`,{method:"PUT",body:JSON.stringify({titre,description})}));
  }
  async function uploadResource(event:FormEvent<HTMLFormElement>,chapterId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await run(()=>api(`/formateur/chapitres/${chapterId}/ressources/fichier`,{method:"POST",body:data}),"Fichier envoyé");form.reset();
  }
  async function addYoutube(event:FormEvent<HTMLFormElement>,chapterId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    await run(()=>api(`/formateur/chapitres/${chapterId}/ressources/youtube`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),urlYoutube:data.get("urlYoutube")})}),"Lien YouTube ajouté");form.reset();
  }
  function move<T extends {id:number}>(items:T[],index:number,direction:-1|1,path:string){
    const target=index+direction;if(target<0||target>=items.length)return;
    const reordered=[...items];[reordered[index],reordered[target]]=[reordered[target],reordered[index]];
    run(()=>api(path,{method:"PUT",body:JSON.stringify({ids:reordered.map(x=>x.id)})}),"Ordre mis à jour");
  }
  async function editResource(resource:Ressource){
    const titre=prompt("Titre de la ressource",resource.titre);if(!titre)return;
    await run(()=>api(`/formateur/ressources/${resource.id}`,{method:"PUT",body:JSON.stringify({titre,telechargeable:resource.telechargeable})}));
  }
  if(!formation)return <Protected role="FORMATEUR"><main><p>{error||"Chargement…"}</p></main></Protected>;
  return <Protected role="FORMATEUR"><main className="workspace"><section className="wide editor">
    <header className="page-header"><div><Link href="/formateur/formations">← Mes formations</Link><h1>{formation.titre}</h1><span className="badge">{formation.statut}</span></div></header>
    {error&&<p className="message error">{error}</p>}{notice&&<p className="message">{notice}</p>}
    <details className="card panel"><summary>Informations de la formation</summary>
      <form className="stack section-space" onSubmit={updateFormation}><FormationFields initial={formation}/><button>Enregistrer</button></form>
      <form className="stack upload-box" onSubmit={uploadCover}><label>Image de couverture<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp" required/></label><button>Envoyer la couverture</button></form>
    </details>
    <section className="card panel"><div className="row spread"><div><h2>Programme</h2><p className="muted">{formation.modules.length} module(s)</p></div></div>
      <form className="inline-form" onSubmit={addModule}><input name="titre" placeholder="Titre du module" required maxLength={180}/><input name="description" placeholder="Description"/><label className="check"><input name="apercu" type="checkbox"/> Aperçu gratuit</label><button>Ajouter</button></form>
      <div className="module-list">{formation.modules.map((module,moduleIndex)=><article className="module" key={module.id}>
        <header className="row spread"><div><span className="order">{moduleIndex+1}</span><strong>{module.titre}</strong>{module.apercuGratuit&&<span className="badge preview">Aperçu gratuit</span>}</div>
          <div className="row compact"><button className="icon" title="Monter" onClick={()=>move(formation.modules,moduleIndex,-1,`/formateur/formations/${id}/modules/ordre`)}>↑</button><button className="icon" title="Descendre" onClick={()=>move(formation.modules,moduleIndex,1,`/formateur/formations/${id}/modules/ordre`)}>↓</button><button className="secondary small" onClick={()=>editModule(module)}>Modifier</button>{moduleIndex===0&&<button className="secondary small" onClick={()=>togglePreview(module)}>{module.apercuGratuit?"Retirer l’aperçu":"Aperçu gratuit"}</button>}<button className="danger small" onClick={()=>confirm("Supprimer ce module et tout son contenu ?")&&run(()=>api(`/formateur/modules/${module.id}`,{method:"DELETE"}),"Module supprimé")}>Supprimer</button></div></header>
        {module.description&&<p className="muted">{module.description}</p>}
        <form className="inline-form nested-form" onSubmit={e=>addChapter(e,module.id)}><input name="titre" placeholder="Nouveau chapitre" required maxLength={180}/><input name="description" placeholder="Description"/><button>Ajouter le chapitre</button></form>
        <div>{module.chapitres.map((chapter,chapterIndex)=><article className="chapter" key={chapter.id}>
          <header className="row spread"><div><span className="order subtle">{chapterIndex+1}</span><strong>{chapter.titre}</strong></div><div className="row compact">
            <button className="icon" onClick={()=>move(module.chapitres,chapterIndex,-1,`/formateur/modules/${module.id}/chapitres/ordre`)}>↑</button><button className="icon" onClick={()=>move(module.chapitres,chapterIndex,1,`/formateur/modules/${module.id}/chapitres/ordre`)}>↓</button><button className="secondary small" onClick={()=>editChapter(chapter)}>Modifier</button><button className="danger small" onClick={()=>confirm("Supprimer ce chapitre ?")&&run(()=>api(`/formateur/chapitres/${chapter.id}`,{method:"DELETE"}),"Chapitre supprimé")}>Supprimer</button></div></header>
          <div className="resource-list">{chapter.ressources.map((resource,resourceIndex)=><div className="resource" key={resource.id}><div><span className="resource-type">{resource.type}</span> <b>{resource.titre}</b><div className="muted tiny">{resource.nomOriginal}{resource.taille?` · ${formatBytes(resource.taille)}`:""}{resource.telechargeable?" · Téléchargeable":""}{resource.urlYoutube?` · ${resource.urlYoutube}`:""}</div></div><div className="row compact"><button className="icon" onClick={()=>move(chapter.ressources,resourceIndex,-1,`/formateur/chapitres/${chapter.id}/ressources/ordre`)}>↑</button><button className="icon" onClick={()=>move(chapter.ressources,resourceIndex,1,`/formateur/chapitres/${chapter.id}/ressources/ordre`)}>↓</button><button className="secondary small" onClick={()=>editResource(resource)}>Modifier</button><button className="danger small" onClick={()=>confirm("Supprimer cette ressource ?")&&run(()=>api(`/formateur/ressources/${resource.id}`,{method:"DELETE"}),"Ressource supprimée")}>Supprimer</button></div></div>)}</div>
          <div className="resource-forms"><form className="upload-box stack" onSubmit={e=>uploadResource(e,chapter.id)}><b>Ajouter un fichier</b><input name="titre" placeholder="Titre" required maxLength={180}/><select name="type" defaultValue={"PDF" satisfies ResourceType}><option value="PDF">PDF</option><option value="VIDEO">Vidéo</option><option value="IMAGE">Image</option></select><input name="file" type="file" accept=".pdf,.mp4,.webm,.jpg,.jpeg,.png,.webp" required/><label className="check"><input name="telechargeable" type="checkbox"/> Téléchargeable</label><button>Envoyer</button></form>
            <form className="upload-box stack" onSubmit={e=>addYoutube(e,chapter.id)}><b>Ajouter un lien YouTube</b><input name="titre" placeholder="Titre" required maxLength={180}/><input name="urlYoutube" type="url" placeholder="https://youtube.com/watch?v=…" required/><button>Ajouter le lien</button></form></div>
        </article>)}</div>
      </article>)}</div>
    </section>
  </section></main></Protected>
}
