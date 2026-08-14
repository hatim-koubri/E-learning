"use client";

import {Bell, CheckCheck, Mail, Settings2, ShieldCheck} from "lucide-react";
import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Pagination, Skeleton} from "@/components/ui";
import {api, ApiRequestError, currentUser} from "@/lib/api";
import type {NotificationCategory, NotificationPage, NotificationPreference} from "@/lib/engagement";

const labels: Record<NotificationCategory, string> = {
  CLASSE: "Classes et séances",
  NOUVEAU_CONTENU: "Nouveaux contenus",
  QUIZ: "Nouveaux quiz",
  REPONSE_FORMATEUR: "Avis et réponses",
  OBJECTIF_HEBDOMADAIRE: "Objectif hebdomadaire",
  COMPTE_FORMATEUR: "Décisions relatives au compte formateur",
};

function messageFor(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 401) return "Votre session a expiré. Reconnectez-vous.";
  if (error instanceof ApiRequestError && error.status === 403) return "Vous n’avez pas l’autorisation d’accéder à ces notifications.";
  return error instanceof Error ? error.message : "Le service de notifications est indisponible.";
}

function safeDate(value?: string | null) {
  if (!value) return "Date non renseignée";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date non renseignée" : date.toLocaleString("fr-FR");
}

export default function NotificationsPage() {
  const role = currentUser()?.role ?? "PARTICIPANT";
  const [data, setData] = useState<NotificationPage | null>(null);
  const [page, setPage] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const pending = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true); setLoadError(""); setActionError(""); setSuccess("");
    try {
      const items = await api<NotificationPage>(`/notifications?page=${page}&size=20`);
      if (items.content.length === 0 && page > 0 && items.totalPages <= page) {
        setPage(Math.max(0, items.totalPages - 1));
        return;
      }
      const settings = role === "ADMIN"
        ? []
        : await api<NotificationPreference[]>("/notifications/preferences");
      setData(items);
      setPreferences(settings);
    } catch (reason) { setLoadError(messageFor(reason)); }
    finally { setLoading(false); }
  }, [page, role]);

  useEffect(() => { queueMicrotask(load); }, [load]);

  async function markRead(id: number) {
    const key = `read-${id}`;
    if (pending.current.has(key)) return;
    pending.current.add(key); setActionError(""); setSuccess("");
    const previous = data;
    setData((current) => current ? {
      ...current,
      nonLues: Math.max(0, current.nonLues - (current.content.find((item) => item.id === id)?.lue ? 0 : 1)),
      content: current.content.map((item) => item.id === id ? {...item, lue: true} : item),
    } : current);
    try { await api(`/notifications/${id}/lue`, {method: "PUT"}); setSuccess("La notification a été marquée comme lue."); }
    catch (reason) { setData(previous); setActionError(messageFor(reason)); }
    finally { pending.current.delete(key); }
  }

  async function markAllRead() {
    if (pending.current.has("read-all")) return;
    pending.current.add("read-all"); setActionError(""); setSuccess("");
    const previous = data;
    setData((current) => current ? {...current, nonLues: 0, content: current.content.map((item) => ({...item, lue: true}))} : current);
    try { await api("/notifications/tout-lire", {method: "PUT"}); setSuccess("Toutes les notifications ont été marquées comme lues."); }
    catch (reason) { setData(previous); setActionError(messageFor(reason)); }
    finally { pending.current.delete("read-all"); }
  }

  async function updatePreference(current: NotificationPreference, field: "dansApplication" | "emailActif") {
    const configurable = field === "dansApplication" ? current.configurableDansApplication : current.configurableEmail;
    const key = `${current.categorie}-${field}`;
    if (!configurable || pending.current.has(key)) return;
    pending.current.add(key); setActionError(""); setSuccess("");
    const next = {...current, [field]: !current[field]};
    setPreferences((items) => items.map((item) => item.categorie === current.categorie ? next : item));
    try {
      const confirmed = await api<NotificationPreference>("/notifications/preferences", {
        method: "PUT", body: JSON.stringify(next),
      });
      setPreferences((items) => items.map((item) => item.categorie === current.categorie ? confirmed : item));
      setSuccess(`Préférences « ${labels[current.categorie]} » confirmées par le serveur.`);
    } catch (reason) {
      setPreferences((items) => items.map((item) => item.categorie === current.categorie ? current : item));
      setActionError(messageFor(reason));
    } finally { pending.current.delete(key); }
  }

  return <Protected><AppShell role={role}>
    <PageHeader eyebrow={role === "ADMIN" ? "Administration" : "Informations utiles"} title="Centre de notifications"
      description={role === "ADMIN"
        ? "Consultez les informations administratives qui nécessitent votre attention."
        : "Choisissez séparément les informations facultatives reçues dans l’application et par email."}
      actions={<Button variant="secondary" onClick={markAllRead} disabled={!data?.nonLues}><CheckCheck size={17} /> Tout marquer comme lu</Button>} />
    <div aria-live="polite" aria-atomic="true">{success && <Alert variant="success">{success}</Alert>}</div>
    <div aria-live="assertive" aria-atomic="true">{actionError && <Alert variant="error">{actionError}</Alert>}</div>
    {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : loadError ? <ErrorState message={loadError} onRetry={load} /> : <div className={`notifications-layout${role === "ADMIN" ? " notifications-layout-admin" : ""}`}>
      <Card>
        <div className="panel-heading"><div><h2>Récentes</h2><p aria-live="polite">{data?.nonLues || 0} non lue(s)</p></div><Bell size={22} /></div>
        {data?.content.length ? <><div className="notification-list">{data.content.map((item) =>
          <article className={item.lue ? "notification read" : "notification"} key={item.id}>
            <span className="notification-dot" aria-hidden="true" /><div>
              <div className="row"><Badge>{labels[item.categorie]}</Badge><small>{safeDate(item.createdAt)}</small></div>
              <h3>{item.titre}</h3><p>{item.message}</p><div className="row">
                {item.actionUrl && <Link className="text-link" href={item.actionUrl}>Ouvrir</Link>}
                {!item.lue && <button type="button" className="link-button" onClick={() => markRead(item.id)}>Marquer comme lue</button>}
              </div>
            </div>
          </article>)}</div>
          <Pagination page={data.page} totalPages={data.totalPages}
            onPrevious={() => setPage((current) => Math.max(0, current - 1))}
            onNext={() => setPage((current) => Math.min(data.totalPages - 1, current + 1))} /></>
          : <EmptyState title="Aucune notification" description="Aucune information ne nécessite votre attention." />}
      </Card>
      {role === "ADMIN" ? <Card className="admin-notification-note">
        <div className="panel-heading"><div><h2>Communications administratives</h2><p>Les décisions importantes restent traçables.</p></div><ShieldCheck aria-hidden="true" size={22} /></div>
        <p>Les emails liés aux décisions sur les demandes Formateur sont obligatoires et ne peuvent pas être désactivés.</p>
      </Card> : <Card>
        <div className="panel-heading"><div><h2>Préférences</h2><p>Les réglages concernent uniquement les futurs événements.</p></div><Settings2 size={21} /></div>
        <div className="preference-list">{preferences.map((item) => <fieldset key={item.categorie}>
          <legend>{labels[item.categorie]}</legend>
          <label className="checkbox-field"><input type="checkbox" checked={item.dansApplication} disabled={!item.configurableDansApplication}
            onChange={() => updatePreference(item, "dansApplication")} /> Dans l’application</label>
          <label className="checkbox-field"><input type="checkbox" checked={item.emailActif} disabled={!item.configurableEmail}
            onChange={() => updatePreference(item, "emailActif")} /><Mail size={15} aria-hidden="true" /> Email</label>
          {(!item.configurableDansApplication || !item.configurableEmail) && <small>Communication obligatoire liée à la sécurité ou à la décision administrative.</small>}
        </fieldset>)}</div>
      </Card>}
    </div>}
  </AppShell></Protected>;
}
