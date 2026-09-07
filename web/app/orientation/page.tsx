"use client";

import {Bot,Check,Compass,GitCompareArrows,Plus,RefreshCw,Send,Sparkles,UserRound} from "lucide-react";
import Link from "next/link";
import {FormEvent,useCallback,useEffect,useRef,useState} from "react";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {Alert,Badge,Button,Card} from "@/components/ui";
import {api,ApiRequestError,currentUser} from "@/lib/api";
import type {OrientationConversation,OrientationRecommendation,OrientationSummary,SendOrientationResponse} from "@/lib/orientation";

const starters=["Je veux créer des sites web et trouver un stage.","Quelle est la différence entre Java et JavaScript ?","DevOps est-il adapté à un débutant ?","Mon budget est de 600 DH et j’ai quatre heures par semaine."];
const SESSION_KEY="nexalearn_orientation_session";

export default function OrientationPage(){
  const [conversation,setConversation]=useState<OrientationConversation|null>(null);const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);const [error,setError]=useState<{message:string;code?:string}|null>(null);const [selected,setSelected]=useState<number[]>([]);
  const [history,setHistory]=useState<OrientationSummary[]>([]);
  const bottom=useRef<HTMLDivElement>(null);const optimisticSequence=useRef(-1);const participant=typeof window!=="undefined"&&currentUser()?.role==="PARTICIPANT";

  const create=useCallback(async()=>{setBusy(true);setError(null);setSelected([]);try{const session=localStorage.getItem(SESSION_KEY);const data=await api<OrientationConversation>("/orientation/conversations",{method:"POST",body:JSON.stringify({sessionId:session})});localStorage.setItem(SESSION_KEY,data.sessionId);setConversation(data);if(currentUser()?.role==="PARTICIPANT")setHistory(await api<OrientationSummary[]>("/orientation/conversations"));}catch(reason){showError(reason,setError);}finally{setBusy(false)}},[]);
  async function openHistory(id:number){setBusy(true);setError(null);try{setConversation(await api<OrientationConversation>(`/orientation/conversations/${id}`));setSelected([])}catch(reason){showError(reason,setError)}finally{setBusy(false)}}
  useEffect(()=>{const timer=window.setTimeout(()=>void create(),0);return()=>window.clearTimeout(timer)},[create]);
  useEffect(()=>{if(typeof bottom.current?.scrollIntoView==="function")bottom.current.scrollIntoView({behavior:"smooth",block:"nearest"})},[conversation?.messages.length,busy]);

  async function send(event?:FormEvent,message=draft){event?.preventDefault();const content=message.trim();if(!content||busy||!conversation)return;
    setBusy(true);setError(null);setDraft("");const optimistic={id:optimisticSequence.current--,role:"USER" as const,contenu:content,statut:"EN_ATTENTE",createdAt:conversation.updatedAt};
    setConversation(value=>value?{...value,messages:[...value.messages,optimistic]}:value);
    try{const result=await api<SendOrientationResponse>(`/orientation/conversations/${conversation.id}/messages`,{method:"POST",headers:{"X-Orientation-Session":conversation.sessionId},body:JSON.stringify({contenu:content,requestId:crypto.randomUUID().replaceAll("-","")})});
      setConversation(value=>value?{...value,profil:result.profil,recommandations:result.recommandations,messages:[...value.messages.filter(item=>item.id!==optimistic.id),optimistic,result.message].filter(Boolean) as OrientationConversation["messages"]}:value);
    }catch(reason){setConversation(value=>value?{...value,messages:value.messages.filter(item=>item.id!==optimistic.id)}:value);setDraft(content);showError(reason,setError);}finally{setBusy(false)}
  }
  function toggle(id:number){setSelected(value=>value.includes(id)?value.filter(item=>item!==id):value.length<2?[...value,id]:[value[1],id])}
  const compared=conversation?.recommandations.filter(item=>selected.includes(item.formationId))??[];
  return <div className="orientation-page"><PublicHeader/><main id="contenu-principal">
    <section className="orientation-hero"><div className="container"><span className="eyebrow"><Compass size={16}/> Conseiller pédagogique local</span><h1>Parlez de votre projet. Trouvez votre formation.</h1><p>Posez vos questions librement. Le conseiller mémorise vos besoins et ne recommande que des formations réellement publiées.</p><div className="orientation-trust"><span><Sparkles size={16}/> Qwen3 via Ollama</span><span><Check size={16}/> Scores calculés par Khotwa</span></div></div></section>
    <section className="container advisor-layout" aria-label="Conseiller pédagogique">
      <Card className="advisor-chat"><header className="advisor-chat-header"><div><span className="advisor-avatar"><Bot size={22}/></span><div><strong>Conseiller Khotwa</strong><span>{busy?"Réflexion en cours…":"Prêt à vous aider"}</span></div></div><Button variant="ghost" onClick={create} disabled={busy}><Plus size={17}/> Recommencer</Button></header>
        <div className="advisor-messages" role="log" aria-live="polite" aria-busy={busy}>
          {!conversation?.messages.length&&<div className="advisor-welcome"><span className="advisor-avatar large"><Bot size={28}/></span><h2>Bonjour, quel projet avez-vous en tête ?</h2><p>Vous pouvez demander une explication, comparer des domaines ou décrire votre objectif, votre niveau et vos contraintes.</p><div className="starter-grid">{starters.map(item=><button type="button" key={item} onClick={()=>void send(undefined,item)} disabled={busy||!conversation}>{item}</button>)}</div></div>}
          {conversation?.messages.map(message=><article className={`chat-message ${message.role.toLowerCase()}`} key={message.id}><span className="message-icon">{message.role==="USER"?<UserRound size={17}/>:<Bot size={17}/>}</span><div><strong>{message.role==="USER"?"Vous":"Conseiller"}</strong><p>{message.contenu}</p></div></article>)}
          {busy&&conversation?.messages.length?<div className="chat-message assistant generating"><span className="message-icon"><Bot size={17}/></span><div><strong>Conseiller</strong><span className="thinking-dots" aria-label="Génération en cours"><i/><i/><i/></span></div></div>:null}<div ref={bottom}/>
        </div>
        {error&&<Alert variant="error"><strong>{error.code??"Erreur"}</strong> — {error.message} <button className="inline-retry" type="button" onClick={()=>void send()}>Réessayer</button></Alert>}
        <form className="advisor-composer" onSubmit={send}><label className="sr-only" htmlFor="orientation-message">Votre message</label><textarea id="orientation-message" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit()}}} maxLength={2000} rows={2} placeholder="Écrivez librement… (Entrée pour envoyer)" disabled={busy}/><div><small>{draft.length}/2 000</small><Button type="submit" disabled={!draft.trim()||busy||!conversation}>{busy?<RefreshCw className="spin" size={18}/>:<Send size={18}/>} Envoyer</Button></div></form>
      </Card>
      <aside className="advisor-results" aria-label="Recommandations"><div className="results-heading"><div><span className="eyebrow">Sélection réelle</span><h2>Formations recommandées</h2></div>{conversation?.recommandations.length?<Badge variant="primary">{conversation.recommandations.length} résultat(s)</Badge>:null}</div>
        {!conversation?.recommandations.length?<Card className="recommendation-empty"><Compass size={28}/><h3>Les recommandations apparaîtront ici</h3><p>Expliquez votre objectif puis demandez une sélection lorsque vous êtes prêt.</p></Card>:conversation.recommandations.map(item=><RecommendationCard key={item.formationId} item={item} selected={selected.includes(item.formationId)} onToggle={()=>toggle(item.formationId)}/>)}
        {compared.length===2&&<Card className="comparison-panel"><h3><GitCompareArrows size={19}/> Comparaison</h3><div>{compared.map(item=><div key={item.formationId}><strong>{item.titre}</strong><span>{item.score}/100 · {item.prix} DH</span><span>{item.niveau} · {item.langue}</span></div>)}</div><button type="button" onClick={()=>void send(undefined,`Compare la formation ${compared[0].titre} avec ${compared[1].titre}.`)}>Demander l’analyse au conseiller</button></Card>}
        {participant&&<Card className="advisor-history"><h3>Mes conversations</h3>{history.length?history.slice(0,8).map(item=><button type="button" key={item.id} onClick={()=>void openHistory(item.id)} disabled={busy||item.id===conversation?.id}><span>{item.titre}</span><small>{new Date(item.updatedAt).toLocaleDateString("fr-MA")}</small></button>):<p>Cette conversation est liée à votre compte Participant.</p>}</Card>}
      </aside>
    </section></main><Footer/></div>;
}
function RecommendationCard({item,selected,onToggle}:{item:OrientationRecommendation;selected:boolean;onToggle:()=>void}){return <Card className="advisor-recommendation"><div className="recommendation-top"><span className="score-ring" aria-label={`Score ${item.score} sur 100`}><strong>{item.score}</strong><small>/100</small></span><div><Badge variant="primary">#{item.rang} · {item.categorie}</Badge><h3>{item.titre}</h3><p>Par {item.formateur}</p></div></div><div className="recommendation-meta"><span>{item.niveau.replaceAll("_"," ")}</span><span>{item.langue.toUpperCase()}</span><strong>{item.prix===0?"Gratuite":`${item.prix} DH`}</strong></div><ul>{item.raisons.map(reason=><li key={reason}><Check size={15}/>{reason}</li>)}</ul><div className="recommendation-actions"><button type="button" className={selected?"compare-button selected":"compare-button"} aria-pressed={selected} onClick={onToggle}><GitCompareArrows size={17}/>{selected?"Sélectionnée":"Comparer"}</button><Link className="btn btn-primary" href={item.href}>Voir la formation</Link></div></Card>}
function showError(reason:unknown,set:(value:{message:string;code?:string})=>void){const error=reason as ApiRequestError;set({message:error.message,code:error.code})}
