"use client";
import {DragEvent,FormEvent,useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {GripVertical} from "lucide-react";
import {useParams} from "next/navigation";
import {AppShell} from "@/components/AppShell";
import {Protected} from "@/components/Protected";
import {FormationFields,formationPayload} from "@/components/FormationFields";
import {ConfirmDialog,Modal} from "@/components/ui";
import {api,uploadWithProgress} from "@/lib/api";
import {Chapitre,formatBytes,FormationDetail,FormationModule,ResourceType,Ressource} from "@/lib/formations";

type EditTarget=
  | {kind:"module";item:FormationModule}
  | {kind:"chapter";item:Chapitre}
  | {kind:"resource";item:Ressource};

export default function FormationEditor(){
  const id=Number(useParams<{id:string}>().id);
  const [formation,setFormation]=useState<FormationDetail|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [confirmation,setConfirmation]=useState<{title:string;description:string;action:()=>Promise<unknown>}|null>(null),[confirmBusy,setConfirmBusy]=useState(false);
  const [editTarget,setEditTarget]=useState<EditTarget|null>(null),[editBusy,setEditBusy]=useState(false),[draggedModuleId,setDraggedModuleId]=useState<number|null>(null);
  const [coverFile,setCoverFile]=useState<File|null>(null),[resourceFiles,setResourceFiles]=useState<Record<number,File|null>>({}),[uploading,setUploading]=useState("");
  const [uploadProgress,setUploadProgress]=useState<Record<string,number>>({}),[uploadError,setUploadError]=useState<Record<string,string>>({});
  const [uploadControllers,setUploadControllers]=useState<Record<string,AbortController>>({});
  const load=useCallback(()=>api<FormationDetail>(`/formateur/formations/${id}`).then(setFormation).catch(e=>setError(e.message)),[id]);
  useEffect(()=>{load()},[load]);
  async function run(action:()=>Promise<unknown>,message="Modification enregistrée"){
    setError("");setNotice("");
    try{await action();await load();setNotice(message);return true}catch(e){setError((e as Error).message);return false}
  }
  async function updateFormation(event:FormEvent<HTMLFormElement>){
    event.preventDefault();await run(()=>api(`/formateur/formations/${id}`,{method:"PUT",body:JSON.stringify(formationPayload(event.currentTarget))}));
  }
  async function uploadCover(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    const file=coverFile,error=validateLocalFile(file,"IMAGE");if(error){setUploadError(current=>({...current,cover:error}));return}const controller=new AbortController();setUploadControllers(current=>({...current,cover:controller}));setUploading("cover");setUploadError(current=>({...current,cover:""}));
    try{await uploadWithProgress(`/formateur/formations/${id}/couverture`,data,value=>setUploadProgress(current=>({...current,cover:value})),controller.signal);await load();setNotice("Couverture envoyée");form.reset();setCoverFile(null)}catch(reason){if((reason as Error).name!=="AbortError")setUploadError(current=>({...current,cover:(reason as Error).message}));await load()}finally{setUploading("");setUploadControllers(current=>{const next={...current};delete next.cover;return next})}
  }
  async function addModule(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    if(await run(()=>api(`/formateur/formations/${id}/modules`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),description:data.get("description"),apercuGratuit:data.get("apercu")==="on"})}),"Module ajouté"))form.reset();
  }
  async function togglePreview(module:FormationModule){
    await run(()=>api(`/formateur/modules/${module.id}`,{method:"PUT",body:JSON.stringify({titre:module.titre,description:module.description??"",apercuGratuit:!module.apercuGratuit})}));
  }
  async function addChapter(event:FormEvent<HTMLFormElement>,moduleId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    if(await run(()=>api(`/formateur/modules/${moduleId}/chapitres`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),description:data.get("description")})}),"Chapitre ajouté"))form.reset();
  }
  async function uploadResource(event:FormEvent<HTMLFormElement>,chapterId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    const key=`resource-${chapterId}`,type=String(data.get("type")) as ResourceType,file=resourceFiles[chapterId],error=validateLocalFile(file,type);if(error){setUploadError(current=>({...current,[key]:error}));return}const controller=new AbortController();setUploadControllers(current=>({...current,[key]:controller}));setUploading(key);setUploadError(current=>({...current,[key]:""}));
    try{await uploadWithProgress(`/formateur/chapitres/${chapterId}/ressources/fichier`,data,value=>setUploadProgress(current=>({...current,[key]:value})),controller.signal);await load();setNotice("Fichier envoyé");form.reset();setResourceFiles(current=>({...current,[chapterId]:null}))}catch(reason){if((reason as Error).name!=="AbortError")setUploadError(current=>({...current,[key]:(reason as Error).message}));await load()}finally{setUploading("");setUploadControllers(current=>{const next={...current};delete next[key];return next})}
  }
  async function addYoutube(event:FormEvent<HTMLFormElement>,chapterId:number){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);
    if(await run(()=>api(`/formateur/chapitres/${chapterId}/ressources/youtube`,{method:"POST",body:JSON.stringify({titre:data.get("titre"),urlYoutube:data.get("urlYoutube")})}),"Lien YouTube ajouté"))form.reset();
  }
  function move<T extends {id:number}>(items:T[],index:number,direction:-1|1,path:string){
    const target=index+direction;if(target<0||target>=items.length)return;
    const reordered=[...items];[reordered[index],reordered[target]]=[reordered[target],reordered[index]];
    run(()=>api(path,{method:"PUT",body:JSON.stringify({ids:reordered.map(x=>x.id)})}),"Ordre mis à jour");
  }
  function dropModule(event:DragEvent<HTMLElement>,targetId:number){
    event.preventDefault();
    if(draggedModuleId===null||draggedModuleId===targetId)return setDraggedModuleId(null);
    const from=formation?.modules.findIndex(module=>module.id===draggedModuleId)??-1;
    const to=formation?.modules.findIndex(module=>module.id===targetId)??-1;
    if(!formation||from<0||to<0)return setDraggedModuleId(null);
    const reordered=[...formation.modules];const [dragged]=reordered.splice(from,1);reordered.splice(to,0,dragged);
    setDraggedModuleId(null);
    void run(()=>api(`/formateur/formations/${id}/modules/ordre`,{method:"PUT",body:JSON.stringify({ids:reordered.map(module=>module.id)})}),"Ordre mis à jour");
  }
  async function saveEdit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editTarget)return;
    const data=new FormData(event.currentTarget),titre=String(data.get("titre")??""),description=String(data.get("description")??"");
    setEditBusy(true);
    try{
      let saved=false;
      if(editTarget.kind==="module")saved=await run(()=>api(`/formateur/modules/${editTarget.item.id}`,{method:"PUT",body:JSON.stringify({titre,description,apercuGratuit:data.get("apercuGratuit")==="on"})}));
      if(editTarget.kind==="chapter")saved=await run(()=>api(`/formateur/chapitres/${editTarget.item.id}`,{method:"PUT",body:JSON.stringify({titre,description})}));
      if(editTarget.kind==="resource")saved=await run(()=>api(`/formateur/ressources/${editTarget.item.id}`,{method:"PUT",body:JSON.stringify({titre,telechargeable:data.get("telechargeable")==="on"})}));
      if(saved)setEditTarget(null);
    }finally{setEditBusy(false)}
  }
  async function confirmAction(){if(!confirmation)return;setConfirmBusy(true);try{if(await confirmation.action())setConfirmation(null)}finally{setConfirmBusy(false)}}
  const changeStatus=(statut:"PUBLIEE"|"DEPUBLIEE"|"ARCHIVEE",message:string)=>run(()=>api(`/formateur/formations/${id}/statut`,{method:"PUT",body:JSON.stringify({statut})}),message);
  if(!formation)return <Protected role="FORMATEUR"><AppShell role="FORMATEUR"><div className="route-loading"><div>{error||"Chargement…"}</div></div></AppShell></Protected>;
  const publicationIssues=[...(formation.modules.length?[]:[{label:"Ajouter un module",href:"#programme"}]),...formation.modules.flatMap(module=>module.chapitres.length?module.chapitres.flatMap(chapter=>chapter.ressources.length?[]:[{label:`Ajouter une ressource à « ${chapter.titre} »`,href:`#chapter-${chapter.id}`} ]):[{label:`Ajouter un chapitre à « ${module.titre} »`,href:`#module-${module.id}`}])];
  return <Protected role="FORMATEUR"><AppShell role="FORMATEUR"><section className="wide editor">
    <header className="page-header editor-heading"><div><Link className="back-link" href="/formateur/formations">← Formations</Link><h1>{formation.titre}</h1><span className="badge">{formation.statut}</span></div><div className="row editor-primary-actions">{formation.statut==="PUBLIEE"?<Link className="secondary button-link" href={`/catalogue/${id}`}>Aperçu participant</Link>:<span className="muted" title="Publiez la formation pour ouvrir son aperçu public">Aperçu disponible après publication</span>}<Link className="button-link" href={`/formateur/formations/${id}/quiz`}>Quiz</Link>{["BROUILLON","DEPUBLIEE"].includes(formation.statut)&&<button onClick={()=>changeStatus("PUBLIEE","Formation publiée")}>Publier</button>}{formation.statut==="PUBLIEE"&&<button onClick={()=>changeStatus("DEPUBLIEE","Formation dépubliée")}>Dépublier</button>}{formation.statut!=="ARCHIVEE"&&<button className="danger" onClick={()=>setConfirmation({title:"Archiver cette formation ?",description:"Elle disparaîtra du catalogue. Les participants déjà inscrits conserveront leur accès acquis.",action:()=>changeStatus("ARCHIVEE","Formation archivée")})}>Archiver</button>}</div></header>
    <nav className="editor-steps" aria-label="Étapes de conception"><a href="#informations">1. Informations</a><a href="#offre">2. Offre</a><a href="#programme">3. Programme</a><a href="#ressources">4. Ressources</a><Link href={`/formateur/formations/${id}/quiz`}>5. Quiz</Link><a href="#publication">6. Vérification</a></nav>
    {error&&<p className="message error" role="alert">{error}</p>}{notice&&<p className="message" role="status" aria-live="polite">{notice}</p>}
    {formation.statut==="ARCHIVEE"?<p className="message">Cette formation est archivée et ne peut plus être modifiée.</p>:<><details className="card panel editor-section" id="informations" open><summary>1–2. Informations générales et offre</summary><span id="offre" className="anchor-target"/>
      <form className="stack section-space" onSubmit={updateFormation}><FormationFields initial={formation}/><button>Enregistrer</button></form>
      <CoverPreview formationId={id} hasCover={Boolean(formation.imageCouvertureKey)} title={formation.titre} version={formation.updatedAt}/>
      <form className="stack upload-box" onSubmit={uploadCover}><label>Image de couverture<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp" required onChange={event=>setCoverFile(event.target.files?.[0]??null)}/></label>{coverFile&&<FileSummary file={coverFile}/>} {uploading==="cover"&&<progress max="100" value={uploadProgress.cover??0}>{uploadProgress.cover??0}%</progress>}{uploading==="cover"&&<span>{uploadProgress.cover??0}<span aria-hidden="true"> %</span></span>}{uploadError.cover&&<p className="message error">{uploadError.cover}</p>}<div className="row"><button disabled={uploading==="cover"} aria-busy={uploading==="cover"}>{uploading==="cover"?"Envoi…":"Envoyer la couverture"}</button>{uploading==="cover"&&<button type="button" className="secondary" onClick={()=>uploadControllers.cover?.abort()}>Annuler l’envoi</button>}</div></form>
    </details>
    <section className="card panel editor-section" id="programme"><div className="row spread"><div><span className="resource-kicker">Étapes 3 et 4</span><h2>Programme et ressources</h2><p className="muted">{formation.modules.length} module(s) · module → chapitre → ressource</p></div></div><span id="ressources" className="anchor-target"/>
      <form className="inline-form" onSubmit={addModule}><input name="titre" placeholder="Titre du module" required maxLength={180}/><input name="description" placeholder="Description"/><label className="check"><input name="apercu" type="checkbox"/> Aperçu gratuit</label><button>Ajouter</button></form>
      <div className="module-list">{formation.modules.map((module,moduleIndex)=><article id={`module-${module.id}`} className={`module ${draggedModuleId===module.id?"is-dragging":""}`} key={module.id} onDragOver={event=>event.preventDefault()} onDrop={event=>dropModule(event,module.id)}>
        <header className="row spread"><div className="module-identity"><span className="drag-handle" draggable onDragStart={event=>{event.dataTransfer.effectAllowed="move";setDraggedModuleId(module.id)}} onDragEnd={()=>setDraggedModuleId(null)} title="Faire glisser pour réordonner"><GripVertical aria-hidden="true" size={18}/></span><span className="order">{moduleIndex+1}</span><strong>{module.titre}</strong>{module.apercuGratuit&&<span className="badge preview">Aperçu gratuit</span>}</div>
          <div className="row compact"><button type="button" className="icon" aria-label={`Monter le module ${module.titre}`} disabled={moduleIndex===0} onClick={()=>move(formation.modules,moduleIndex,-1,`/formateur/formations/${id}/modules/ordre`)}>↑</button><button type="button" className="icon" aria-label={`Descendre le module ${module.titre}`} disabled={moduleIndex===formation.modules.length-1} onClick={()=>move(formation.modules,moduleIndex,1,`/formateur/formations/${id}/modules/ordre`)}>↓</button><button type="button" className="secondary small" onClick={()=>setEditTarget({kind:"module",item:module})}>Modifier</button>{moduleIndex===0&&<button type="button" className="secondary small" onClick={()=>togglePreview(module)}>{module.apercuGratuit?"Retirer l’aperçu":"Aperçu gratuit"}</button>}<button type="button" className="danger small" onClick={()=>setConfirmation({title:"Supprimer ce module ?",description:"Tous ses chapitres et ressources seront également supprimés. Cette action est irréversible.",action:()=>run(()=>api(`/formateur/modules/${module.id}`,{method:"DELETE"}),"Module supprimé")})}>Supprimer</button></div></header>
        {module.description&&<p className="muted">{module.description}</p>}
        <form className="inline-form nested-form" onSubmit={e=>addChapter(e,module.id)}><input name="titre" placeholder="Nouveau chapitre" required maxLength={180}/><input name="description" placeholder="Description"/><button>Ajouter le chapitre</button></form>
        <div>{module.chapitres.map((chapter,chapterIndex)=><article id={`chapter-${chapter.id}`} className="chapter" key={chapter.id}>
          <header className="row spread"><div><span className="order subtle">{chapterIndex+1}</span><strong>{chapter.titre}</strong></div><div className="row compact">
            <button type="button" className="icon" aria-label={`Monter le chapitre ${chapter.titre}`} disabled={chapterIndex===0} onClick={()=>move(module.chapitres,chapterIndex,-1,`/formateur/modules/${module.id}/chapitres/ordre`)}>↑</button><button type="button" className="icon" aria-label={`Descendre le chapitre ${chapter.titre}`} disabled={chapterIndex===module.chapitres.length-1} onClick={()=>move(module.chapitres,chapterIndex,1,`/formateur/modules/${module.id}/chapitres/ordre`)}>↓</button><button type="button" className="secondary small" onClick={()=>setEditTarget({kind:"chapter",item:chapter})}>Modifier</button><button type="button" className="danger small" onClick={()=>setConfirmation({title:"Supprimer ce chapitre ?",description:"Les ressources liées à ce chapitre seront supprimées. Cette action est irréversible.",action:()=>run(()=>api(`/formateur/chapitres/${chapter.id}`,{method:"DELETE"}),"Chapitre supprimé")})}>Supprimer</button></div></header>
          <div className="resource-list">{chapter.ressources.map((resource,resourceIndex)=><div className="resource" key={resource.id}><div><span className="resource-type">{resource.type}</span> <b>{resource.titre}</b><div className="muted tiny">{resource.nomOriginal}{resource.taille?` · ${formatBytes(resource.taille)}`:""}{resource.telechargeable?" · Téléchargeable":""}{resource.urlYoutube?` · ${resource.urlYoutube}`:""}</div></div><div className="row compact"><button type="button" className="icon" aria-label={`Monter la ressource ${resource.titre}`} disabled={resourceIndex===0} onClick={()=>move(chapter.ressources,resourceIndex,-1,`/formateur/chapitres/${chapter.id}/ressources/ordre`)}>↑</button><button type="button" className="icon" aria-label={`Descendre la ressource ${resource.titre}`} disabled={resourceIndex===chapter.ressources.length-1} onClick={()=>move(chapter.ressources,resourceIndex,1,`/formateur/chapitres/${chapter.id}/ressources/ordre`)}>↓</button><button type="button" className="secondary small" onClick={()=>setEditTarget({kind:"resource",item:resource})}>Modifier</button><button type="button" className="danger small" onClick={()=>setConfirmation({title:"Supprimer cette ressource ?",description:"Le fichier ou le lien sera retiré définitivement de ce chapitre.",action:()=>run(()=>api(`/formateur/ressources/${resource.id}`,{method:"DELETE"}),"Ressource supprimée")})}>Supprimer</button></div></div>)}</div>
          <div className="resource-forms"><form className="upload-box stack" onSubmit={e=>uploadResource(e,chapter.id)}><b>Ajouter un fichier</b><input name="titre" placeholder="Titre" required maxLength={180}/><select name="type" defaultValue={"PDF" satisfies ResourceType}><option value="PDF">PDF</option><option value="VIDEO">Vidéo</option><option value="IMAGE">Image</option></select><input name="file" type="file" accept=".pdf,.mp4,.webm,.jpg,.jpeg,.png,.webp" required onChange={event=>setResourceFiles(current=>({...current,[chapter.id]:event.target.files?.[0]??null}))}/>{resourceFiles[chapter.id]&&<FileSummary file={resourceFiles[chapter.id]!}/>}<label className="check"><input name="telechargeable" type="checkbox"/> Téléchargeable</label>{uploading===`resource-${chapter.id}`&&<><progress max="100" value={uploadProgress[`resource-${chapter.id}`]??0}/><span>{uploadProgress[`resource-${chapter.id}`]??0} %</span></>}{uploadError[`resource-${chapter.id}`]&&<p className="message error">{uploadError[`resource-${chapter.id}`]}</p>}<div className="row"><button disabled={uploading===`resource-${chapter.id}`} aria-busy={uploading===`resource-${chapter.id}`}>{uploading===`resource-${chapter.id}`?"Envoi…":"Envoyer"}</button>{uploading===`resource-${chapter.id}`&&<button type="button" className="secondary" onClick={()=>uploadControllers[`resource-${chapter.id}`]?.abort()}>Annuler l’envoi</button>}</div></form>
            <form className="upload-box stack" onSubmit={e=>addYoutube(e,chapter.id)}><b>Ajouter un lien YouTube</b><input name="titre" placeholder="Titre" required maxLength={180}/><input name="urlYoutube" type="url" placeholder="https://youtube.com/watch?v=…" required/><button>Ajouter le lien</button></form></div>
        </article>)}</div>
      </article>)}</div>
    </section>
    <section className="card panel verification-panel editor-section" id="publication"><span className="resource-kicker">Étape 6</span><h2>Vérification et publication</h2><p>Chaque module doit contenir un chapitre et chaque chapitre au moins une ressource disponible.</p>{publicationIssues.length?<div className="publication-issues" role="status"><strong>{publicationIssues.length} point(s) à compléter</strong><ul>{publicationIssues.map(issue=><li key={issue.href}><a href={issue.href}>{issue.label}</a></li>)}</ul></div>:<p className="message">Le programme est structurellement prêt pour la publication.</p>}<div className="row">{["BROUILLON","DEPUBLIEE"].includes(formation.statut)&&<button disabled={publicationIssues.length>0} onClick={()=>changeStatus("PUBLIEE","Formation publiée")}>Publier la formation</button>}{formation.statut==="PUBLIEE"&&<button className="secondary" onClick={()=>changeStatus("DEPUBLIEE","Formation dépubliée")}>Dépublier avant une modification structurante</button>}</div></section>
    <Modal open={Boolean(editTarget)} title={editTarget?.kind==="module"?"Modifier le module":editTarget?.kind==="chapter"?"Modifier le chapitre":"Modifier la ressource"} description="Les modifications sont enregistrées sur le serveur puis répercutées dans le programme." onClose={()=>setEditTarget(null)}>
      {editTarget&&<form className="stack" onSubmit={saveEdit}>
        <label>Titre<input name="titre" required maxLength={180} defaultValue={editTarget.item.titre}/></label>
        {editTarget.kind!=="resource"&&<label>Description<textarea name="description" maxLength={10000} defaultValue={editTarget.item.description??""}/></label>}
        {editTarget.kind==="module"&&editTarget.item.ordre===0&&<label className="check"><input name="apercuGratuit" type="checkbox" defaultChecked={editTarget.item.apercuGratuit}/> Module disponible en aperçu gratuit</label>}
        {editTarget.kind==="resource"&&<label className="check"><input name="telechargeable" type="checkbox" defaultChecked={editTarget.item.telechargeable}/> Ressource téléchargeable</label>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setEditTarget(null)} disabled={editBusy}>Annuler</button><button disabled={editBusy}>{editBusy?"Enregistrement…":"Enregistrer"}</button></div>
      </form>}
    </Modal></>}
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title??""} description={confirmation?.description??""} confirmLabel={confirmation?.title.startsWith("Archiver")?"Archiver":"Supprimer"} danger busy={confirmBusy} onCancel={()=>setConfirmation(null)} onConfirm={confirmAction}/>
  </section></AppShell></Protected>
}

function FileSummary({file}:{file:File}){
  return <p className="file-summary" role="status"><strong>{file.name}</strong><span>{file.type||"Type non déclaré"} · {formatBytes(file.size)}</span></p>;
}

function validateLocalFile(file:File|null|undefined,type:ResourceType){if(!file)return "Sélectionnez un fichier.";const allowed:Record<string,string[]>={IMAGE:["image/jpeg","image/png","image/webp"],PDF:["application/pdf"],VIDEO:["video/mp4","video/webm"],YOUTUBE:[]};if(!allowed[type].includes(file.type))return "Le type MIME ou l’extension du fichier n’est pas autorisé.";const limits={IMAGE:10*1024*1024,PDF:50*1024*1024,VIDEO:500*1024*1024,YOUTUBE:0};if(file.size>limits[type])return "Le fichier dépasse la taille maximale autorisée.";return "";}

function CoverPreview({formationId,hasCover,title,version}:{formationId:number;hasCover:boolean;title:string;version:string}){
  if(!hasCover)return <div className="upload-box"><strong>Aucune couverture</strong><p className="muted">Ajoutez une image JPG, PNG ou WebP.</p></div>;
  return <CoverImageAccess key={version} formationId={formationId} title={title}/>;
}
function CoverImageAccess({formationId,title}:{formationId:number;title:string}){
  const [url,setUrl]=useState(""),[failed,setFailed]=useState(false);
  useEffect(()=>{let active=true;api<{url:string}>(`/formateur/formations/${formationId}/couverture-acces`).then(value=>{if(active){setUrl(value.url);setFailed(false)}}).catch(()=>{if(active)setFailed(true)});return()=>{active=false}},[formationId]);
  if(failed)return <div className="message error">La couverture ne peut pas être affichée actuellement.</div>;
  // URL MinIO signée et éphémère: next/image ne peut pas connaître son hôte à la compilation.
  // eslint-disable-next-line @next/next/no-img-element
  return url?<img className="course-cover-image" src={url} alt={`Couverture de la formation ${title}`} onError={()=>setFailed(true)}/>:<div className="upload-box">Chargement de la couverture…</div>;
}
