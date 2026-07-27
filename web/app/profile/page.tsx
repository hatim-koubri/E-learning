"use client";
import {useEffect,useState} from "react";import {api,logout,User} from "@/lib/api";import {Protected} from "@/components/Protected";
export default function Page(){const [user,setUser]=useState<User|null>(null);useEffect(()=>{api<User>("/auth/me").then(setUser).catch(logout)},[]);
return <Protected><main><section className="card"><h1>Mon profil</h1>{user?<div className="stack"><p><b>{user.nom}</b><br/>{user.email}</p><p>Rôle : {user.role}<br/>Statut : {user.statut}</p><button onClick={logout}>Se déconnecter</button></div>:<p>Chargement…</p>}</section></main></Protected>}

