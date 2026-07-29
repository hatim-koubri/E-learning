"use client";
import {FormEvent,useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {api} from "@/lib/api";
type Quiz={id:number;titre:string;scoreMinimal:number;important:boolean;publie:boolean;questions:{id:number;libelle:string;points:number;reponses:{id:number;libelle:string;correcte:boolean}[]}[]};
type DraftQuestion={libelle:string;points:number;reponses:{libelle:string;correcte:boolean}[]};
const blank=():DraftQuestion=>({libelle:"",points:1,reponses:[{libelle:"",correcte:true},{libelle:"",correcte:false}]});
export default function QuizEditor(){
 const formationId=Number(useParams<{id:string}>().id);const [items,setItems]=useState<Quiz[]>([]),[questions,setQuestions]=useState<DraftQuestion[]>([blank()]),[error,setError]=useState("");
 const load=useCallback(()=>api<Quiz[]>(`/formateur/formations/${formationId}/quiz`).then(setItems).catch(e=>setError(e.message)),[formationId]);useEffect(()=>{load()},[load]);
 function patchQuestion(index:number,value:Partial<DraftQuestion>){setQuestions(q=>q.map((item,i)=>i===index?{...item,...value}:item))}
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,data=new FormData(form);
  const payload={titre:data.get("titre"),scoreMinimal:Number(data.get("scoreMinimal")),
   important:data.get("important")==="on",publie:data.get("publie")==="on",
   questions:questions.map((q,qi)=>({...q,ordre:qi,reponses:q.reponses.map((a,ai)=>({...a,ordre:ai}))}))};
  try{await api(`/formateur/formations/${formationId}/quiz`,{method:"POST",body:JSON.stringify(payload)});
   setQuestions([blank()]);form.reset();await load()}catch(x){setError((x as Error).message)}
 }
 return <Protected role="FORMATEUR"><main className="workspace"><section className="wide editor"><Link href={`/formateur/formations/${formationId}`}>← Formation</Link><h1>QCM de la formation</h1>{error&&<p className="message error">{error}</p>}<form className="card panel stack" onSubmit={create}><input name="titre" placeholder="Titre du quiz" required/><div className="row"><label>Seuil de réussite (%)<input name="scoreMinimal" type="number" min="0" max="100" defaultValue="70" required/></label><label className="check"><input name="important" type="checkbox"/> Quiz important (fenêtre 24 h)</label><label className="check"><input name="publie" type="checkbox"/> Publier</label></div>{questions.map((q,qi)=><fieldset className="quiz-question" key={qi}><legend>Question {qi+1}</legend><input value={q.libelle} onChange={e=>patchQuestion(qi,{libelle:e.target.value})} placeholder="Énoncé" required/><label>Points<input type="number" min=".01" step=".01" value={q.points} onChange={e=>patchQuestion(qi,{points:Number(e.target.value)})}/></label>{q.reponses.map((a,ai)=><div className="row" key={ai}><input value={a.libelle} onChange={e=>patchQuestion(qi,{reponses:q.reponses.map((x,j)=>j===ai?{...x,libelle:e.target.value}:x)})} placeholder={`Réponse ${ai+1}`} required/><label className="check"><input type="checkbox" checked={a.correcte} onChange={e=>patchQuestion(qi,{reponses:q.reponses.map((x,j)=>j===ai?{...x,correcte:e.target.checked}:x)})}/> Correcte</label></div>)}<button type="button" className="secondary small" onClick={()=>patchQuestion(qi,{reponses:[...q.reponses,{libelle:"",correcte:false}]})}>Ajouter une réponse</button></fieldset>)}<div className="row"><button type="button" className="secondary" onClick={()=>setQuestions(q=>[...q,blank()])}>Ajouter une question</button><button>Créer le QCM</button></div></form><div className="module-list">{items.map(q=><article className="card panel" key={q.id}><div className="row spread"><h2>{q.titre}</h2><span className="badge">{q.publie?"PUBLIÉ":"BROUILLON"}</span></div><p>{q.questions.length} question(s) · seuil {q.scoreMinimal}% · {q.important?"important, 3/24 h":"normal, 3/8 h"}</p><button className="danger small" onClick={()=>confirm("Supprimer ce QCM ?")&&api(`/formateur/quiz/${q.id}`,{method:"DELETE"}).then(load)}>Supprimer</button></article>)}</div></section></main></Protected>
}
