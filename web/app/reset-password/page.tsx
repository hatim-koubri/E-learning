"use client";
import {FormEvent,Suspense,useState} from "react";import {api} from "@/lib/api";import {useSearchParams} from "next/navigation";
function ResetForm(){const params=useSearchParams(),[message,setMessage]=useState(""),[error,setError]=useState("");
async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);try{const r=await api<{message:string}>("/auth/reset-password",{method:"POST",body:JSON.stringify({token:params.get("token"),password:d.get("password")})});setMessage(r.message)}catch(x){setError((x as Error).message)}}
return <main><section className="card"><h1>Nouveau mot de passe</h1><form className="stack" onSubmit={submit}><label>Mot de passe<input name="password" type="password" minLength={8} required/></label>{message&&<p className="message">{message}</p>}{error&&<p className="message error">{error}</p>}<button>Modifier</button></form></section></main>}
export default function Page(){return <Suspense fallback={<main><p>Chargement…</p></main>}><ResetForm/></Suspense>}
