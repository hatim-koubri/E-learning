"use client";
import {useCallback,useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {Protected} from "@/components/Protected";
import {api} from "@/lib/api";
import type {QuizParticipant} from "@/lib/learning";
export default function QuizPage(){
 const formationId=Number(useParams<{formationId:string}>().formationId);const [items,setItems]=useState<QuizParticipant[]>([]),[selected,setSelected]=useState<Record<number,number[]>>({}),[result,setResult]=useState(""),[error,setError]=useState("");
 const load=useCallback(()=>api<QuizParticipant[]>(`/participant/formations/${formationId}/quiz`).then(setItems).catch(e=>setError(e.message)),[formationId]);useEffect(()=>{load()},[load]);
 async function submit(q:QuizParticipant){try{const r=await api<{pourcentage:number;reussi:boolean}>(`/participant/quiz/${q.id}/tentatives`,{method:"POST",body:JSON.stringify({reponses:Object.fromEntries(q.questions.map(x=>[x.id,selected[x.id]??[]]))})});setResult(`Résultat : ${r.pourcentage}% — ${r.reussi?"réussi":"non réussi"}`);await load()}catch(e){setError((e as Error).message)}}
 return <Protected role="PARTICIPANT"><main className="workspace"><section className="wide learning"><Link href={`/catalogue/${formationId}`}>← Retour au cours</Link><h1>Évaluations en ligne</h1><p className="muted">La correction et le score sont calculés uniquement par le serveur. Les quiz ne sont pas disponibles hors ligne.</p>{error&&<p className="message error">{error}</p>}{result&&<p className="message">{result}</p>}{items.map(q=><article className="card panel" key={q.id}><h2>{q.titre}</h2><p>Seuil {q.scoreMinimal}% · {q.tentativesRestantes} tentative(s) restante(s)</p>{q.questions.map(question=><fieldset className="quiz-question" key={question.id}><legend>{question.libelle} ({question.points} pt)</legend>{question.reponses.map(answer=><label className="answer" key={answer.id}><input type="checkbox" onChange={e=>setSelected(s=>({...s,[question.id]:e.target.checked?[...(s[question.id]??[]),answer.id]:(s[question.id]??[]).filter(x=>x!==answer.id)}))}/>{answer.libelle}</label>)}</fieldset>)}<button disabled={!q.tentativesRestantes} onClick={()=>submit(q)}>Soumettre et corriger</button></article>)}</section></main></Protected>
}
