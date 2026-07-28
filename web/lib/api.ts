export type User={id:number;nom:string;email:string;telephone?:string;role:"ADMIN"|"FORMATEUR"|"PARTICIPANT";statut:string;createdAt:string};
export type Formateur={id:number;nom:string;email:string;telephone?:string;statut:string;motifRefus?:string;dateDecision?:string;createdAt:string};
type ApiError={message?:string;errors?:Record<string,string>};
const BASE=process.env.NEXT_PUBLIC_API_URL??"http://localhost:8080/api";
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const token=typeof window!=="undefined"?localStorage.getItem("access_token"):null;
  const response=await fetch(`${BASE}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...options.headers}});
  if(!response.ok){const e:ApiError=await response.json().catch(()=>({}));throw new Error(e.message??"Une erreur est survenue.");}
  return response.status===204?undefined as T:response.json();
}
export function saveSession(token:string,user:User){localStorage.setItem("access_token",token);localStorage.setItem("user",JSON.stringify(user));}
export function logout(){localStorage.removeItem("access_token");localStorage.removeItem("user");location.href="/login";}
export function currentUser():User|null{try{return JSON.parse(localStorage.getItem("user")??"null")}catch{return null}}

