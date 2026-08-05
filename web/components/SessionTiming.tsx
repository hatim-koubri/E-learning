"use client";

import {useEffect, useState} from "react";
import {Badge} from "@/components/ui";
import type {Session} from "@/lib/classes";

function statusAt(session: Session, now: number | null) {
  if (session.statut === "ANNULEE") return {label: "Annulée", variant: "danger" as const};
  if (session.statut === "TERMINEE") return {label: "Terminée", variant: "neutral" as const};
  if (now !== null && now >= new Date(session.dateFin).getTime()) return {label: "Terminée", variant: "neutral" as const};
  if (isSessionJoinable(session, now)) {
    return {label: "En direct", variant: "live" as const};
  }
  return {label: "Planifiée", variant: "warning" as const};
}

function countdown(session: Session, now: number | null) {
  if (now === null || session.statut !== "PLANIFIEE") return null;
  const start = new Date(session.dateDebut).getTime();
  const end = new Date(session.dateFin).getTime();
  if (now >= start && now < end) return "Accessible maintenant";
  if (now > end) return null;
  const minutes = Math.max(1, Math.ceil((start - now) / 60_000));
  if (minutes < 60) return `Commence dans ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours < 24) return `Commence dans ${hours} h${remaining ? ` ${remaining} min` : ""}`;
  const days = Math.ceil(hours / 24);
  return `Commence dans ${days} jour${days > 1 ? "s" : ""}`;
}

export function isSessionJoinable(session: Session, now: number | null) {
  if (now === null || session.statut !== "PLANIFIEE") return false;
  return now >= new Date(session.dateDebut).getTime() && now < new Date(session.dateFin).getTime();
}

export function useSessionClock(enabled = true) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const update = () => {
      if (active) setNow(Date.now());
    };
    queueMicrotask(update);
    const timer = window.setInterval(update, 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled]);
  return now;
}

export function SessionTiming({session, now: providedNow}: {session: Session; now?: number | null}) {
  const internalNow = useSessionClock(providedNow === undefined);
  const now = providedNow === undefined ? internalNow : providedNow;
  const status = statusAt(session, now);
  const remaining = countdown(session, now);
  return (
    <div className="session-timing">
      <Badge variant={status.variant}>{status.label}</Badge>
      {remaining && <small aria-live={status.label === "En direct" ? "polite" : "off"}>{remaining}</small>}
    </div>
  );
}
