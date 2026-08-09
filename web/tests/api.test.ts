import {describe,expect,it,vi} from "vitest";
import {api,currentUser,logout,saveSession} from "@/lib/api";

const user={id:1,nom:"Ada",email:"ada@test.local",role:"PARTICIPANT" as const,statut:"ACTIF",createdAt:"2026-01-01"};

describe("client API et authentification",()=>{
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
});
