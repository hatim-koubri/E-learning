"use client";

import Link from "next/link";
import {MessageSquareReply, Save, Star, UsersRound} from "lucide-react";
import {FormEvent, useEffect, useRef, useState} from "react";
import {AppShell} from "@/components/AppShell";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Badge, Button, Card, EmptyState, ErrorState, Skeleton} from "@/components/ui";
import {api, ApiRequestError, currentUser} from "@/lib/api";
import type {InstructorProfile, Review} from "@/lib/engagement";

type TrainerEngagement = {inscriptions: number; avisPublies: number; moyenneAvis: number; avis: Review[]};
type LoadFailure = {status: number; message: string};

function loadFailure(reason: unknown): LoadFailure {
  if (reason instanceof ApiRequestError) return {status: reason.status, message: reason.message};
  return {status: 0, message: reason instanceof Error ? reason.message : "Le backend est inaccessible."};
}

function errorPresentation(error: LoadFailure) {
  if (error.status === 401) return {title: "Session expirée", message: "Reconnectez-vous pour consulter vos indicateurs d’engagement."};
  if (error.status === 403) return {title: "Accès formateur refusé", message: "Votre compte ne dispose pas de l’autorisation FORMATEUR requise."};
  if (error.status >= 500) return {title: "Service d’engagement indisponible", message: "Le serveur n’a pas pu calculer les indicateurs. Réessayez après quelques instants."};
  if (error.status === 0) return {title: "Backend inaccessible", message: "Vérifiez que le serveur est démarré et joignable, puis réessayez."};
  return {title: "Impossible de charger le contenu", message: error.message};
}

export default function TrainerEngagementPage() {
  const [data, setData] = useState<TrainerEngagement | null>(null);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [reply, setReply] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<LoadFailure | null>(null);
  const [actionError, setActionError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading,setProfileLoading]=useState(true),[profileSaving,setProfileSaving]=useState(false),[profileDirty,setProfileDirty]=useState(false);
  const [specialite,setSpecialite]=useState(""),[biographie,setBiographie]=useState("");
  const specialtyRef=useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api<TrainerEngagement>("/formateur/engagement"));
    } catch (reason) {
      setData(null);
      setLoadError(loadFailure(reason));
    }
    finally { setLoading(false); }
  }

  async function loadProfile() {
    const id = currentUser()?.id;
    if (!id) return;
    setProfileError("");
    setProfileLoading(true);
    try { const loaded=await api<InstructorProfile>(`/formateurs/${id}`);setProfile(loaded);if(!profileDirty){setSpecialite(loaded.specialite||"");setBiographie(loaded.biographie||"");} }
    catch (reason) { const failure=loadFailure(reason);setProfileError(errorPresentation(failure).message); }
    finally{setProfileLoading(false);}
  }

  // Chargement initial uniquement; les nouvelles saisies sont ensuite protégées par profileDirty.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { queueMicrotask(() => { void load(); void loadProfile(); }); }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!specialite.trim()||!biographie.trim()){setActionError("La spécialité et la biographie sont obligatoires.");specialtyRef.current?.focus();return;}
    setProfileSaving(true);
    try {
      setActionError("");
      setProfile(await api<InstructorProfile>("/formateur/profil-public", {
        method: "PUT",
        body: JSON.stringify({specialite, biographie}),
      }));setProfileDirty(false);
      setMessage("Profil public mis à jour.");
    } catch (reason) { const failure=loadFailure(reason);setActionError(errorPresentation(failure).message); }
    finally{setProfileSaving(false);}
  }

  async function sendReply(review: Review) {
    try {
      setActionError("");
      const updated = await api<Review>(`/formateur/avis/${review.id}/reponse`, {
        method: "PUT",
        body: JSON.stringify({reponse: reply[review.id]}),
      });
      setData((current) => current ? {...current, avis: current.avis.map((item) => item.id === updated.id ? updated : item)} : current);
      setReply((current) => ({...current, [review.id]: ""}));
    } catch (reason) { setActionError((reason as Error).message); }
  }

  const empty = data !== null && data.inscriptions === 0 && data.avisPublies === 0 && data.avis.length === 0;
  const presentedError = loadError ? errorPresentation(loadError) : null;

  return (
    <Protected role="FORMATEUR">
      <AppShell role="FORMATEUR">
        <PageHeader eyebrow="Engagement agrégé" title="Écouter sans surveiller" description="Les indicateurs proviennent des inscriptions et avis réels. Les notes privées des participants ne sont jamais accessibles ici." />
        {presentedError && <ErrorState title={presentedError.title} message={presentedError.message} onRetry={load} />}
        {actionError && <Alert variant="error">{actionError}</Alert>}
        {profileError && <Alert variant="error">Le profil public n’a pas pu être chargé. <Button size="sm" variant="secondary" onClick={loadProfile}>Réessayer le profil</Button></Alert>}
        {message && <div role="status" aria-live="polite"><Alert variant="success">{message}</Alert></div>}
        {loading ? <Card><Skeleton className="skeleton-cover" /></Card> : data && (
          <>
            {!empty && <div className="engagement-summary" aria-label="Synthèse réelle"><span><UsersRound size={18}/><strong>{data.inscriptions}</strong> inscriptions</span><span><Star size={18}/><strong>{data.moyenneAvis||"—"}</strong> moyenne publiée</span><span><MessageSquareReply size={18}/><strong>{data.avisPublies}</strong> avis publiés</span></div>}
            <div className="dashboard-grid">
              <Card className="engagement-reviews">
                {empty ? (
                  <EmptyState
                    title="Aucune donnée d’engagement pour le moment"
                    description="Publiez une formation et accueillez vos premiers participants pour commencer à suivre l’engagement."
                    action={<Link className="btn btn-primary" href="/formateur/formations">Voir mes formations</Link>}
                  />
                ) : <>
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
                </>}
              </Card>
              <Card className="public-profile-editor">
                <div className="panel-heading"><div><span className="resource-kicker">Votre vitrine pédagogique</span><h2>Profil public</h2><p>Aucune coordonnée privée n’est publiée.</p></div>{currentUser()?.id&&<Link className="text-link" href={`/formateurs/${currentUser()!.id}`}>Voir la page publique</Link>}</div>
                {profile&&!profileLoading&&<div className="public-profile-preview" aria-label="Aperçu du profil public"><span className="avatar" aria-hidden="true">{profile.nom?.slice(0,1)||"F"}</span><div><strong>{profile.nom}</strong><span>{specialite||"Spécialité à renseigner"}</span><p>{biographie||"Votre biographie apparaîtra ici."}</p></div></div>}
                {profileLoading?<Skeleton className="skeleton-cover"/>:<form className="stack" onSubmit={saveProfile} noValidate>
                  <label>Spécialité<input ref={specialtyRef} name="specialite" required maxLength={160} value={specialite} onChange={event=>{setSpecialite(event.target.value);setProfileDirty(true)}} /></label><small>{specialite.length}/160</small>
                  <label>Biographie<textarea name="biographie" required maxLength={3000} value={biographie} onChange={event=>{setBiographie(event.target.value);setProfileDirty(true)}} /></label><small>{biographie.length}/3000</small>
                  <Button type="submit" loading={profileSaving} disabled={profileSaving}><Save size={16} /> Enregistrer</Button>
                </form>}
              </Card>
            </div>
          </>
        )}
      </AppShell>
    </Protected>
  );
}
