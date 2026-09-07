import {afterEach,describe,expect,it,vi} from "vitest";
import {api,apiBlob,currentUser,logout,saveSession,uploadWithProgress} from "@/lib/api";

const user={id:1,nom:"Ada",email:"ada@test.local",role:"PARTICIPANT" as const,statut:"ACTIF",createdAt:"2026-01-01"};

describe("client API et authentification",()=>{
 afterEach(()=>{vi.restoreAllMocks();localStorage.clear()});
 it("enregistre, lit et supprime la session",()=>{
  saveSession("jwt",user);
  expect(currentUser()).toEqual(user);
  expect(localStorage.getItem("access_token")).toBe("jwt");
  const locationValue=window.location;
  Object.defineProperty(window,"location",{configurable:true,value:{...locationValue,href:""}});
  logout();
  expect(currentUser()).toBeNull();
  expect(window.location.href).toBe("/login");
  Object.defineProperty(window,"location",{configurable:true,value:locationValue});
 });
 it("tolère une session JSON invalide",()=>{localStorage.setItem("user","{");expect(currentUser()).toBeNull()});
 it("ajoute le JWT et désérialise une réponse",async()=>{
  saveSession("secret",user);
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({ok:true}),{status:200,headers:{"Content-Type":"application/json"}}));
  await expect(api<{ok:boolean}>("/catalogue")).resolves.toEqual({ok:true});
  const init=fetchMock.mock.calls[0][1] as RequestInit;
  expect(new Headers(init.headers).get("Authorization")).toBe("Bearer secret");
 });
 it("gère 204 et les erreurs API ou non JSON",async()=>{
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(null,{status:204}));
  await expect(api("/vide")).resolves.toBeUndefined();
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(JSON.stringify({message:"Accès refusé",code:"FORBIDDEN"}),{status:403}));
  await expect(api("/interdit")).rejects.toMatchObject({message:"Accès refusé",status:403,code:"FORBIDDEN"});
  vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response("oops",{status:500}));
  await expect(api("/erreur")).rejects.toThrow("Une erreur est survenue.");
 });
 it("ne force pas Content-Type pour FormData",async()=>{
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({}),{status:200}));
  await api("/upload",{method:"POST",body:new FormData()});
  expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).has("Content-Type")).toBe(false);
 });
 it("télécharge un fichier et restitue les erreurs de téléchargement",async()=>{
  saveSession("secret",user);
  const blob=new Blob(["cours"],{type:"text/plain"});
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(new Response(blob,{status:200}));
  await expect(apiBlob("/documents/1")).resolves.toEqual(blob);
  expect(new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers).get("Authorization")).toBe("Bearer secret");
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({message:"Document absent",code:"NOT_FOUND"}),{status:404}));
  await expect(apiBlob("/documents/2")).rejects.toMatchObject({message:"Document absent",status:404,code:"NOT_FOUND"});
  fetchMock.mockResolvedValueOnce(new Response("invalide",{status:500}));
  await expect(apiBlob("/documents/3")).rejects.toThrow("Téléchargement impossible.");
 });
 it("publie un formulaire avec progression et succès",async()=>{
  saveSession("secret",user);
  const listeners:Record<string,(event?:any)=>void>={};
  const uploadListeners:Record<string,(event:any)=>void>={};
  const xhr={status:201,responseText:'{"id":42}',upload:{addEventListener:(name:string,fn:(event:any)=>void)=>{uploadListeners[name]=fn}},open:vi.fn(),setRequestHeader:vi.fn(),addEventListener:(name:string,fn:(event?:any)=>void)=>{listeners[name]=fn},send:vi.fn(),abort:vi.fn()};
  vi.stubGlobal("XMLHttpRequest",function XMLHttpRequestMock(){return xhr});
  const progress=vi.fn();
  const result=uploadWithProgress<{id:number}>("/documents",new FormData(),progress);
  uploadListeners.progress({lengthComputable:true,loaded:999,total:1000});
  listeners.load();
  await expect(result).resolves.toEqual({id:42});
  expect(progress.mock.calls.map(call=>call[0])).toEqual([99,100]);
  expect(xhr.setRequestHeader).toHaveBeenCalledWith("Authorization","Bearer secret");
 });
 it("signale les échecs, erreurs réseau et annulations d'envoi",async()=>{
  const scenarios=[
   {status:422,responseText:'{"message":"Fichier refusé","code":"INVALID"}',event:"load",message:"Fichier refusé"},
   {status:0,responseText:"",event:"error",message:"Le backend est inaccessible."},
   {status:0,responseText:"",event:"abort",message:"Envoi annulé"}
  ];
  for(const scenario of scenarios){
   const listeners:Record<string,()=>void>={};
   const xhr={...scenario,upload:{addEventListener:vi.fn()},open:vi.fn(),setRequestHeader:vi.fn(),addEventListener:(name:string,fn:()=>void)=>{listeners[name]=fn},send:vi.fn(),abort:vi.fn()};
   vi.stubGlobal("XMLHttpRequest",function XMLHttpRequestMock(){return xhr});
   const promise=uploadWithProgress("/documents",new FormData(),vi.fn());
   listeners[scenario.event]();
   await expect(promise).rejects.toThrow(scenario.message);
  }
 });
});
