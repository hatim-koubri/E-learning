"use client";

import {type ReactNode, useEffect, useState} from "react";
import type {User} from "@/lib/api";

type SessionState = {
  resolved: boolean;
  user: User | null;
};

function readStoredUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null") as User | null;
  } catch {
    return null;
  }
}

export function useResolvedSession() {
  const [session, setSession] = useState<SessionState>({resolved: false, user: null});

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setSession({resolved: true, user: readStoredUser()});
    });
    return () => {
      active = false;
    };
  }, []);

  return session;
}

export function GuestOnly({children}: {children: ReactNode}) {
  const {resolved, user} = useResolvedSession();

  if (!resolved || user) return null;
  return <>{children}</>;
}
