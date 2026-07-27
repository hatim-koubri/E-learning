"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {api,saveSession,User} from "@/lib/api";
import {useRouter} from "next/navigation";

export function LoginForm(){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");const router=useRouter();
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");
  const data=new FormData(e.currentTarget);
  try{const r=await api<{accessToken:string;user:User}>("/auth/login",{method:"POST",body:JSON.stringify({email:data.get("email"),password:data.get("password")})});
   saveSession(r.accessToken,r.user);router.push(r.user.role==="ADMIN"?"/admin/formateurs":"/profile");
  }catch(x){setError((x as Error).message)}finally{setBusy(false)}}
 return <form className="stack" onSubmit={submit}><label>Email<input name="email" type="email" required/></label><label>Mot de passe<input name="password" type="password" required/></label>{error&&<p className="message error">{error}</p>}<button disabled={busy}>{busy?"Connexion…":"Se connecter"}</button><nav><Link href="/forgot-password">Mot de passe oublié</Link><Link href="/register/participant">Créer un compte</Link></nav></form>
}

export function RegisterForm({kind}:{kind:"participant"|"formateur"}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");const d=new FormData(e.currentTarget);
  const password=String(d.get("password"));if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(password)){setError("Le mot de passe doit contenir 8 caractères, majuscule, minuscule, chiffre et caractère spécial.");setBusy(false);return}
  try{await api(`/auth/register/${kind}`,{method:"POST",body:JSON.stringify({nom:d.get("nom"),email:d.get("email"),telephone:d.get("telephone"),password})});setMessage(kind==="formateur"?"Demande envoyée. Un administrateur doit la valider.":"Compte créé. Vous pouvez vous connecter.");e.currentTarget.reset()}catch(x){setError((x as Error).message)}finally{setBusy(false)}}
 return <form className="stack" onSubmit={submit}><label>Nom<input name="nom" required maxLength={120}/></label><label>Email<input name="email" type="email" required/></label><label>Téléphone<input name="telephone" maxLength={30}/></label><label>Mot de passe<input name="password" type="password" minLength={8} required/></label>{message&&<p className="message">{message}</p>}{error&&<p className="message error">{error}</p>}<button disabled={busy}>{busy?"Envoi…":kind==="formateur"?"Envoyer la demande":"Créer mon compte"}</button><Link href="/login">Retour à la connexion</Link></form>
}

