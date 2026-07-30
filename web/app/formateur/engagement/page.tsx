"use client";

import {MessageSquareReply, Save, Star, UsersRound} from "lucide-react";
import {FormEvent, useEffect, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
import type {InstructorProfile, Review} from "@/lib/engagement";

type TrainerEngagement = {inscriptions: number; avisPublies: number; moyenneAvis: number; avis: Review[]};

export default function TrainerEngagementPage() {
  const [data, setData] = useState<TrainerEngagement | null>(null);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [reply, setReply] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const engagement = await api<TrainerEngagement>("/formateur/engagement");
      setData(engagement);
      const id = currentUser()?.id;
      if (id) setProfile(await api<InstructorProfile>(`/formateurs/${id}`));
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { queueMicrotask(load); }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setProfile(await api<InstructorProfile>("/formateur/profil-public", {
        method: "PUT",
        body: JSON.stringify({specialite: form.get("specialite"), biographie: form.get("biographie")}),
      }));
      setMessage("Profil public mis à jour.");
    } catch (reason) { setError((reason as Error).message); }
  }

  async function sendReply(review: Review) {
    try {
      const updated = await api<Review>(`/formateur/avis/${review.id}/reponse`, {
        method: "PUT",
        body: JSON.stringify({reponse: reply[review.id]}),
      });
      setData((current) => current ? {...current, avis: current.avis.map((item) => item.id === updated.id ? updated : item)} : current);
      setReply((current) => ({...current, [review.id]: ""}));
    } catch (reason) { setError((reason as Error).message); }
  }

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader eyebrow="Engagement agrégé" title="Écouter sans surveiller" description="Les indicateurs proviennent des inscriptions et avis réels. Les notes privées des participants ne sont jamais accessibles ici." />
        {error && <ErrorState message={error} onRetry={load} />}
        {message && <Alert variant="success">{message}</Alert>}
        {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : data && (
          <>
            <div className="stats-grid">
              <Card className="stat-card"><span className="stat-icon"><UsersRound size={21} /></span><div><small>Inscriptions réelles</small><strong>{data.inscriptions}</strong></div></Card>
              <Card className="stat-card"><span className="stat-icon success"><Star size={21} /></span><div><small>Moyenne publiée</small><strong>{data.moyenneAvis || "—"}</strong></div></Card>
              <Card className="stat-card"><span className="stat-icon warning"><MessageSquareReply size={21} /></span><div><small>Avis publiés</small><strong>{data.avisPublies}</strong></div></Card>
            </div>
            <div className="dashboard-grid">
              <Card>
                <div className="panel-heading"><div><h2>Avis sur mes formations</h2><p>Répondez de façon pédagogique et factuelle.</p></div></div>
                {data.avis.length ? <div className="review-list">
                  {data.avis.map((review) => (
                    <article key={review.id}>
                      <div className="row"><Badge variant={review.statut === "PUBLIE" ? "success" : "warning"}>{review.statut}</Badge><strong>{"★".repeat(review.note)}{"☆".repeat(5 - review.note)}</strong></div>
                      <h3>{review.participant}</h3><p>{review.commentaire}</p>
                      {review.reponseFormateur && <blockquote><strong>Votre réponse</strong>{review.reponseFormateur}</blockquote>}
                      <label>Répondre<textarea value={reply[review.id] || ""} maxLength={2000} onChange={(event) => setReply((current) => ({...current, [review.id]: event.target.value}))} /></label>
                      <Button disabled={!reply[review.id]?.trim()} onClick={() => sendReply(review)}><MessageSquareReply size={16} /> Publier la réponse</Button>
                    </article>
                  ))}
                </div> : <EmptyState title="Aucun avis" description="Les avis éligibles apparaîtront ici après publication par un participant." />}
              </Card>
              <Card>
                <div className="panel-heading"><div><h2>Profil public</h2><p>Aucune coordonnée privée n’est publiée.</p></div></div>
                <form className="stack" onSubmit={saveProfile}>
                  <label>Spécialité<input name="specialite" required maxLength={160} defaultValue={profile?.specialite || ""} /></label>
                  <label>Biographie<textarea name="biographie" required maxLength={3000} defaultValue={profile?.biographie || ""} /></label>
                  <Button type="submit"><Save size={16} /> Enregistrer</Button>
                </form>
              </Card>
            </div>
          </>
        )}
      </AppShell>
    </Protected>
  );
}
