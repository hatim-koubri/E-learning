"use client";
import {useEffect,useState} from "react";import {currentUser,User} from "@/lib/api";import {useRouter} from "next/navigation";
export function Protected({role,children}:{role?:User["role"];children:React.ReactNode}){const router=useRouter(),[ok,setOk]=useState(false);
useEffect(()=>{const u=currentUser();if(!u||role&&u.role!==role)router.replace("/login");else queueMicrotask(()=>setOk(true))},[role,router]);return ok?children:<main><p>Chargement…</p></main>}
