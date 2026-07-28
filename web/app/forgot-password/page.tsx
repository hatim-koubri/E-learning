"use client";
import {FormEvent,useState} from "react";import {api} from "@/lib/api";import Link from "next/link";
export default function Page(){const [message,setMessage]=useState(""),[busy,setBusy]=useState(false);
async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const d=new FormData(e.currentTarget);const r=await api<{message:string}>("/auth/forgot-password",{method:"POST",body:JSON.stringify({email:d.get("email")})});setMessage(r.message);setBusy(false)}
return <main><section className="card"><h1>Mot de passe oublié</h1><form className="stack" onSubmit={submit}><label>Email<input name="email" type="email" required/></label>{message&&<p className="message">{message}</p>}<button disabled={busy}>Envoyer le lien</button><Link href="/login">Retour</Link></form></section></main>}

