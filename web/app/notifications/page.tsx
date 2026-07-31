"use client";

import {Bell, CheckCheck, Mail, Settings2} from "lucide-react";
import Link from "next/link";
import {useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
import type {NotificationCategory, NotificationPage, NotificationPreference} from "@/lib/engagement";

const labels: Record<NotificationCategory, string> = {
  CLASSE: "Classes",
  NOUVEAU_CONTENU: "Nouveaux contenus",
  QUIZ: "Quiz",
  REPONSE_FORMATEUR: "Réponses",
  OBJECTIF_HEBDOMADAIRE: "Objectif hebdomadaire",
  COMPTE_FORMATEUR: "Compte formateur",
};

export default function NotificationsPage() {
  const role = currentUser()?.role ?? "PARTICIPANT";
  const [data, setData] = useState<NotificationPage | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [items, settings] = await Promise.all([
        api<NotificationPage>("/notifications"),
        api<NotificationPreference[]>("/notifications/preferences"),
      ]);
      setData(items);
      setPreferences(settings);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { queueMicrotask(load); }, []);

  async function markRead(id: number) {
    await api(`/notifications/${id}/lue`, {method: "PUT"});
    setData((current) => current ? {
      ...current,
      nonLues: Math.max(0, current.nonLues - (current.content.find((item) => item.id === id)?.lue ? 0 : 1)),
      content: current.content.map((item) => item.id === id ? {...item, lue: true} : item),
    } : current);
  }

  async function markAllRead() {
    await api("/notifications/tout-lire", {method: "PUT"});
    setData((current) => current ? {...current, nonLues: 0, content: current.content.map((item) => ({...item, lue: true}))} : current);
  }

  async function updatePreference(current: NotificationPreference, field: "dansApplication" | "emailActif") {
    const next = {...current, [field]: !current[field]};
    setPreferences((items) => items.map((item) => item.categorie === current.categorie ? next : item));
    try {
      await api("/notifications/preferences", {method: "PUT", body: JSON.stringify(next)});
    } catch (reason) {
      setPreferences((items) => items.map((item) => item.categorie === current.categorie ? current : item));
      setError((reason as Error).message);
    }
  }

  return (
    <Protected>
      <AppShell role={role}>
        <PageHeader
          eyebrow="Informations utiles"
          title="Centre de notifications"
          description="Gardez uniquement les catégories qui vous aident. Les emails sont désactivés par défaut."
          actions={<Button variant="secondary" onClick={markAllRead} disabled={!data?.nonLues}><CheckCheck size={17} /> Tout marquer comme lu</Button>}
        />
        {error && <ErrorState message={error} onRetry={load} />}
        {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : (
          <div className="notifications-layout">
            <Card>
              <div className="panel-heading"><div><h2>Récentes</h2><p>{data?.nonLues || 0} non lue(s)</p></div><Bell size={22} /></div>
              {data?.content.length ? (
                <div className="notification-list">
                  {data.content.map((item) => (
                    <article className={item.lue ? "notification read" : "notification"} key={item.id}>
                      <span className="notification-dot" />
                      <div>
                        <div className="row"><Badge>{labels[item.categorie]}</Badge><small>{new Date(item.createdAt).toLocaleString("fr-FR")}</small></div>
                        <h3>{item.titre}</h3>
                        <p>{item.message}</p>
                        <div className="row">
                          {item.actionUrl && <Link className="text-link" href={item.actionUrl}>Ouvrir</Link>}
                          {!item.lue && <button className="link-button" onClick={() => markRead(item.id)}>Marquer comme lue</button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState title="Aucune notification" description="Les informations utiles apparaîtront ici, sans rappel excessif." />}
            </Card>
            <Card>
              <div className="panel-heading"><div><h2>Préférences</h2><p>Chaque catégorie se règle séparément.</p></div><Settings2 size={21} /></div>
              <div className="preference-list">
                {preferences.map((item) => (
                  <div key={item.categorie}>
                    <strong>{labels[item.categorie]}</strong>
                    <label><input type="checkbox" checked={item.dansApplication} onChange={() => updatePreference(item, "dansApplication")} /> Dans l’application</label>
                    <label><input type="checkbox" checked={item.emailActif} onChange={() => updatePreference(item, "emailActif")} /><Mail size={15} /> Email facultatif</label>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </AppShell>
    </Protected>
  );
}
