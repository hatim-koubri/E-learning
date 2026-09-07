export type User={id:number;nom:string;email:string;telephone?:string;role:"ADMIN"|"FORMATEUR"|"PARTICIPANT";statut:string;createdAt:string};
export type Formateur={id:number;nom:string;email:string;telephone?:string;statut:string;motifRefus?:string;dateDecision?:string;decision?:"ACCEPTE"|"REFUSE";decideurAdminId?:number;createdAt?:string;specialite?:string;biographie?:string};
export type FormateurPage={content:Formateur[];page:number;totalPages:number;totalElements:number};
export type TrainerCredential={id:number;type:"CV"|"AUTRE"|"DIPLOME"|"CERTIFICAT";nomFichier:string;contentType:string;taille:number;ajouteLe:string;urlTemporaire:string};
export type FormateurApplication={profil:Formateur;justificatifs:TrainerCredential[]};
export type AccountStatus="ACTIF"|"EN_ATTENTE"|"REFUSE"|"SUSPENDU"|"SUPPRIME";
export type AdminUser={id:number;nom:string;email:string;telephone?:string;role:User["role"];statut:AccountStatus;createdAt:string;updatedAt?:string;suspendedAt?:string;suspensionReason?:string;deletedAt?:string;anonymizedAt?:string;version:number};
export type AdminUserPage={content:AdminUser[];page:number;size:number;totalPages:number;totalElements:number};
export type AdminUserDetail={user:AdminUser;relations:Record<string,number>;editable:boolean;suspendable:boolean;reactivatable:boolean;deletable:boolean};
export type DeletionImpact={userId:number;mode:"INTERDITE"|"SUPPRESSION_PHYSIQUE"|"ANONYMISATION";relations:Record<string,number>;allowed:boolean;explanation:string;version:number};
export type MonthlyPoint={month:string;inscriptions:number;comptesCrees:number};
export type DashboardData={generatedAt:string;timezone:string;periodStart:string;periodEnd:string;indicators:Record<string,number>;roleDistribution:Record<string,number>;formationStatusDistribution:Record<string,number>;monthlySeries:MonthlyPoint[];popularFormations:Array<{formationId:number;titre:string;inscriptions:number}>};
export type AuditItem={id:number;actorId:number;actorName:string;targetType:string;targetId?:number;action:string;result:string;reason?:string;previousStatus?:string;newStatus?:string;beforeSnapshot?:string;afterSnapshot?:string;occurredAt:string};
export type AuditPage={content:AuditItem[];page:number;size:number;totalPages:number;totalElements:number};
type ApiError={message?:string;code?:string;errors?:Record<string,string>};
export class ApiRequestError extends Error{
  constructor(message:string,public readonly status:number,public readonly code?:string){
    super(message);this.name="ApiRequestError";
  }
}
const BASE=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8080/api";
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const token=typeof window!=="undefined"?localStorage.getItem("access_token"):null;
  const headers=new Headers(options.headers);
  if(!(options.body instanceof FormData)&&!headers.has("Content-Type"))headers.set("Content-Type","application/json");
  if(token)headers.set("Authorization",`Bearer ${token}`);
  const response=await fetch(`${BASE}${path}`,{...options,headers});
  if(!response.ok){
    const e:ApiError=await response.json().catch(()=>({}));
    if(response.status===401&&token&&typeof window!=="undefined"){
      localStorage.removeItem("access_token");localStorage.removeItem("user");
      window.location.href="/login?expired=1";
      throw new Error("Votre session a expiré. Reconnectez-vous.");
    }
    throw new ApiRequestError(e.message??"Une erreur est survenue.",response.status,e.code);
  }
  return response.status===204?undefined as T:response.json();
}
export async function apiBlob(path:string):Promise<Blob>{
  const token=typeof window!=="undefined"?localStorage.getItem("access_token"):null;
  const headers=new Headers();if(token)headers.set("Authorization",`Bearer ${token}`);
  const response=await fetch(`${BASE}${path}`,{headers});
  if(!response.ok){const error:ApiError=await response.json().catch(()=>({}));throw new ApiRequestError(error.message??"Téléchargement impossible.",response.status,error.code);}
  return response.blob();
}
export function uploadWithProgress<T>(path:string,body:FormData,onProgress:(percent:number)=>void,signal?:AbortSignal):Promise<T>{
  return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open("POST",`${BASE}${path}`);const token=localStorage.getItem("access_token");if(token)xhr.setRequestHeader("Authorization",`Bearer ${token}`);
    xhr.upload.addEventListener("progress",event=>{if(event.lengthComputable)onProgress(Math.min(99,Math.round(event.loaded*100/event.total)))});
    xhr.addEventListener("load",()=>{let payload:unknown={};try{payload=xhr.responseText?JSON.parse(xhr.responseText):{}}catch{}if(xhr.status>=200&&xhr.status<300){onProgress(100);resolve(payload as T)}else{const error=payload as ApiError;reject(new ApiRequestError(error.message??"L’envoi a échoué.",xhr.status,error.code))}});
    xhr.addEventListener("error",()=>reject(new ApiRequestError("Le backend est inaccessible.",0,"NETWORK_ERROR")));
    xhr.addEventListener("abort",()=>reject(new DOMException("Envoi annulé","AbortError")));
    signal?.addEventListener("abort",()=>xhr.abort(),{once:true});xhr.send(body);
  });
}
export function saveSession(token:string,user:User){localStorage.setItem("access_token",token);localStorage.setItem("user",JSON.stringify(user));}
export function logout(){localStorage.removeItem("access_token");localStorage.removeItem("user");location.href="/login";}
export function currentUser():User|null{
  if(typeof window==="undefined")return null;
  try{return JSON.parse(localStorage.getItem("user")??"null")}catch{return null}
}
