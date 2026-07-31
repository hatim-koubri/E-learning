"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CheckCircle2,
  CirclePlay,
  Clock3,
  FileImage,
  FileText,
  Globe2,
  GraduationCap,
  LockKeyhole,
  PlaySquare,
  Route,
  Share2,
  Star,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {useParams, useRouter} from "next/navigation";
import {useCallback, useEffect, useState, type FormEvent} from "react";
import {levelLabel} from "@/components/CourseCard";
import {FavoriteButton} from "@/components/FavoriteButton";
import {Footer} from "@/components/Footer";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PublicHeader} from "@/components/PublicHeader";
import {Alert, Badge, Button, ErrorState, IconButton, PageSkeleton, Toast} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
import type {Review, ReviewSummary} from "@/lib/engagement";
import type {CatalogueDetail, PublicResource, ResourceAccess} from "@/lib/learning";

function resourceIcon(type: PublicResource["type"]) {
  if (type === "VIDEO") return CirclePlay;
  if (type === "PDF") return FileText;
  if (type === "YOUTUBE") return PlaySquare;
  return FileImage;
}

export default function CourseDetail() {
  const id = Number(useParams<{id: string}>().id);
  const router = useRouter();
  const [course, setCourse] = useState<CatalogueDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState<ResourceAccess | null>(null);
  const [busy, setBusy] = useState("");
  const [reviews, setReviews] = useState<ReviewSummary>({
    moyenne: 0, nombre: 0, content: [], page: 0, totalPages: 0,
  });
  const [noteChapter, setNoteChapter] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [reviewNote, setReviewNote] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [courseResponse, reviewResponse] = await Promise.all([
        api<CatalogueDetail>(`/catalogue/${id}`),
        api<ReviewSummary>(`/catalogue/${id}/avis`),
      ]);
      setCourse(courseResponse);
      setReviews(Array.isArray(reviewResponse?.content)
        ? reviewResponse
        : {moyenne: 0, nombre: 0, content: [], page: 0, totalPages: 0});
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, [id]);

  useEffect(() => {
    // The request deliberately owns the loading state for the initial page load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function participantOrLogin() {
    const user = currentUser();
    if (!user) {
      router.push("/login");
      return false;
    }
    if (user.role !== "PARTICIPANT") {
      setError("Cette action est réservée aux comptes participants.");
      return false;
    }
    return true;
  }

  async function enroll(withClasses = false) {
    if (!participantOrLogin()) return;
    setBusy(withClasses ? "classes" : "content");
    setError("");
    try {
      const response = await api<{prixPaye?: number; devise?: string}>(
        `/participant/formations/${id}/${withClasses ? "inscription-avec-classes" : "inscription"}`,
        {
          method: "POST",
          headers: withClasses ? {"Idempotency-Key": crypto.randomUUID()} : undefined,
        },
      );
      setNotice(
        withClasses && response.prixPaye !== undefined
          ? `Inscription confirmée à ${response.prixPaye} ${response.devise ?? "DH"}, option classes incluse.`
          : "Votre inscription est confirmée. Le contenu est maintenant accessible.",
      );
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function upgradeClasses() {
    if (!participantOrLogin()) return;
    setBusy("upgrade");
    setError("");
    try {
      const response = await api<{montant: number; devise: string}>(`/participant/formations/${id}/upgrade-classes`, {
        method: "POST",
        headers: {"Idempotency-Key": crypto.randomUUID()},
      });
      setNotice(`Option classes ajoutée pour ${response.montant} ${response.devise}.`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function open(resourceId: number) {
    setBusy(`resource-${resourceId}`);
    setError("");
    try {
      setActive(await api<ResourceAccess>(`/catalogue/${id}/ressources/${resourceId}/acces`));
    } catch (reason) {
      setError(`${(reason as Error).message} Le lien a peut-être expiré : réessayez.`);
    } finally {
      setBusy("");
    }
  }

  async function complete(chapterId: number) {
    setBusy(`chapter-${chapterId}`);
    try {
      await api(`/participant/formations/${id}/chapitres/${chapterId}/progression`, {
        method: "PUT",
        body: JSON.stringify({termine: true, positionVideoSecondes: 0}),
      });
      await api(`/participant/formations/${id}/position`, {
        method: "PUT",
        body: JSON.stringify({chapitreId: chapterId}),
      });
      setNotice("Chapitre marqué comme terminé. Votre progression a été mise à jour.");
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function saveNote(chapterId: number, signet: boolean) {
    setBusy(`note-${chapterId}`);
    try {
      await api(`/participant/formations/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({chapitreId: chapterId, contenu: noteDraft || null, signet}),
      });
      setNotice(signet ? "Signet privé ajouté." : "Note privée enregistrée.");
      setNoteDraft("");
      setNoteChapter(null);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("review");
    const wasEditing = Boolean(editingReview);
    try {
      await api(editingReview ? `/participant/avis/${editingReview.id}` : `/participant/formations/${id}/avis`, {
        method: editingReview ? "PUT" : "POST",
        body: JSON.stringify({note: reviewNote, commentaire: reviewComment}),
      });
      setReviewComment("");
      setEditingReview(null);
      setReviews(await api<ReviewSummary>(`/catalogue/${id}/avis`));
      setNotice(wasEditing ? "Votre avis a été modifié." : "Votre avis a été publié.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function deleteReview(reviewId: number) {
    try {
      await api(`/participant/avis/${reviewId}`, {method: "DELETE"});
      setReviews(await api<ReviewSummary>(`/catalogue/${id}/avis`));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function reportReview(reviewId: number) {
    const motif = window.prompt("Pourquoi signalez-vous cet avis ?");
    if (!motif?.trim()) return;
    try {
      await api(`/participant/avis/${reviewId}/signalement`, {
        method: "POST",
        body: JSON.stringify({motif}),
      });
      setNotice("Signalement transmis à la modération.");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function shareCourse() {
    const shareData = {title: course?.titre, text: course?.description, url: window.location.href};
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setNotice("Lien de la formation copié.");
      }
    } catch {
      // L'annulation native du partage ne doit pas créer d'erreur visible.
    }
  }

  if (!course && !error) {
    return (
      <div className="detail-page">
        <PublicHeader />
        <main className="container course-detail" id="contenu-principal"><PageSkeleton cards={2} /></main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="detail-page">
        <PublicHeader />
        <main className="container course-detail" id="contenu-principal">
          <ErrorState message={error} onRetry={load} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="detail-page">
      <PublicHeader />
      <main className="container course-detail" id="contenu-principal">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            name: course.titre,
            description: course.description,
            inLanguage: course.langue,
            provider: {"@type": "Organization", name: "NexaLearn"},
            offers: {"@type": "Offer", price: course.prix, priceCurrency: "MAD"},
            ...(reviews.nombre ? {aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: reviews.moyenne,
              ratingCount: reviews.nombre,
            }} : {}),
          }).replaceAll("<", "\\u003c")}}
        />
        <Link className="text-link" href="/catalogue"><ArrowLeft size={17} /> Catalogue</Link>
        <section className="course-hero">
          <div className="course-hero-copy">
            <div className="row">
              <Badge variant="primary">{levelLabel(course.niveau)}</Badge>
              <Badge>{course.categorie}</Badge>
            </div>
            <h1>{course.titre}</h1>
            <p>{course.description}</p>
            <div className="course-detail-meta">
              <span><GraduationCap size={18} /> {course.formateurId ? <Link href={`/formateurs/${course.formateurId}`}>{course.formateur}</Link> : course.formateur}</span>
              <span><Globe2 size={18} /> {course.langue.toUpperCase()}</span>
              <span><BookOpen size={18} /> {course.nombreModules} modules</span>
              <span><Star size={18} /> {reviews.nombre ? `${reviews.moyenne}/5 · ${reviews.nombre} avis` : "Aucun avis publié"}</span>
            </div>
            <div className="price">{course.prix === 0 ? "Gratuite" : `${course.prix} ${course.devise}`}</div>
            <FavoriteButton formationId={id} />
            <Button type="button" variant="ghost" onClick={shareCourse}><Share2 size={17} /> Partager la formation</Button>
            {!course.inscrit ? (
              <div className="stack">
                <div className="row">
                  <Button loading={busy === "content"} onClick={() => enroll(false)}>
                    {course.prix === 0 ? "S’inscrire gratuitement" : "Simuler l’achat"}
                  </Button>
                  <Button variant="secondary" loading={busy === "classes"} onClick={() => enroll(true)}>
                    <UsersRound size={18} /> Choisir contenu + classes
                  </Button>
                </div>
                <p className="purchase-note">
                  Le paiement est entièrement simulé pour ce MVP. Aucune donnée bancaire n’est demandée.
                  Le serveur confirme le prix de l’option classes lorsqu’elle est disponible.
                </p>
              </div>
            ) : (
              <div className="row">
                <Link className="button-link" href={`/apprentissage/${id}`}><Route size={17} /> Voir mon parcours</Link>
                <Link className="button-link" href={`/apprentissage/${id}/quiz`}>Passer les QCM</Link>
                <Button variant="secondary" loading={busy === "upgrade"} onClick={upgradeClasses}>
                  <UsersRound size={18} /> Ajouter les classes
                </Button>
              </div>
            )}
          </div>
          <div className="course-side">
            {course.imageUrl ? (
              <Image unoptimized width={600} height={375} className="detail-cover" src={course.imageUrl} alt="" />
            ) : (
              <div className="course-side-placeholder"><BookOpen size={48} /></div>
            )}
          </div>
        </section>

        <section className="surface-card course-knowledge-path" aria-labelledby="course-path-title">
          <div><span className="eyebrow">Le parcours de connaissance</span><h2 id="course-path-title">De la découverte à la maîtrise</h2><p>Les étapes avancent uniquement avec votre progression réelle.</p></div>
          <KnowledgePath active={course.inscrit ? 1 : 0} compact />
        </section>

        {error && <Alert variant="error">{error}</Alert>}
        {active && (
          <section className="surface-card player" aria-label="Lecteur de ressource">
            <div className="row spread">
              <strong>Ressource de formation</strong>
              <IconButton label="Fermer le lecteur" onClick={() => setActive(null)}><X size={18} /></IconButton>
            </div>
            {active.type === "VIDEO" ? (
              <video controls src={active.url} />
            ) : active.type === "PDF" ? (
              <iframe title="Document PDF" src={active.url} />
            ) : active.type === "YOUTUBE" ? (
              <Alert><a className="text-link" target="_blank" rel="noreferrer" href={active.url}>Ouvrir sur YouTube</a></Alert>
            ) : (
              <Image unoptimized width={1000} height={600} src={active.url} alt="Ressource de formation" />
            )}
          </section>
        )}

        <div className="program-layout">
          <section className="program-main">
            <h2>Programme de la formation</h2>
            <div className="module-list">
              {course.modules.map((module) => (
                <article className={`module ${module.verrouille ? "locked" : ""}`} key={module.id}>
                  <header className="module-heading">
                    <div>
                      <div className="row">
                        <Badge>Module {module.ordre + 1}</Badge>
                        {module.apercuGratuit && <Badge variant="success">Aperçu gratuit</Badge>}
                      </div>
                      <h3>{module.titre}</h3>
                      {module.description && <p>{module.description}</p>}
                    </div>
                    {module.verrouille && <LockKeyhole aria-label="verrouillé" size={20} />}
                  </header>
                  {module.chapitres.map((chapter) => (
                    <section className="chapter" key={chapter.id}>
                      <div className="row spread">
                        <strong>{chapter.ordre + 1}. {chapter.titre}</strong>
                        {!chapter.verrouille && course.inscrit && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={busy === `chapter-${chapter.id}`}
                            onClick={() => complete(chapter.id)}
                          >
                            <CheckCircle2 size={16} /> Marquer terminé
                          </Button>
                        )}
                      </div>
                      {chapter.description && <p>{chapter.description}</p>}
                      {!chapter.verrouille && course.inscrit && (
                        <div className="chapter-tools">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setNoteChapter((current) => current === chapter.id ? null : chapter.id)}
                          >
                            <BookOpen size={15} /> Note privée
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={busy === `note-${chapter.id}`}
                            onClick={() => saveNote(chapter.id, true)}
                          >
                            <Bookmark size={15} /> Placer un signet
                          </Button>
                          {noteChapter === chapter.id && (
                            <div className="inline-note">
                              <label>
                                Ma note privée
                                <textarea
                                  value={noteDraft}
                                  maxLength={5000}
                                  placeholder="Une idée, un résumé ou une question à retenir…"
                                  onChange={(event) => setNoteDraft(event.target.value)}
                                />
                              </label>
                              <Button
                                size="sm"
                                disabled={!noteDraft.trim()}
                                loading={busy === `note-${chapter.id}`}
                                onClick={() => saveNote(chapter.id, false)}
                              >
                                Enregistrer la note
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="resource-list">
                        {chapter.ressources.map((resource) => {
                          const Icon = resourceIcon(resource.type);
                          return (
                            <button
                              className="resource-open"
                              disabled={resource.verrouille || busy === `resource-${resource.id}`}
                              onClick={() => open(resource.id)}
                              key={resource.id}
                              id={`ressource-${resource.id}`}
                              aria-label={`${resource.type} · ${resource.titre}`}
                            >
                              <Icon aria-hidden="true" size={18} />
                              <strong>{resource.type} · {resource.titre}</strong>
                              <span>{resource.verrouille ? <LockKeyhole size={16} /> : <CirclePlay size={16} />}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </article>
              ))}
            </div>
          </section>
          <aside className="surface-card program-summary">
            <h2>Ce parcours comprend</h2>
            <ul>
              <li><BookOpen size={17} /> {course.nombreModules} modules structurés</li>
              <li><CirclePlay size={17} /> {course.nombreChapitres} chapitres</li>
              <li><Clock3 size={17} /> Apprentissage à votre rythme</li>
              <li><ShieldCheck size={17} /> Accès contrôlé aux ressources</li>
            </ul>
          </aside>
        </div>
        <section className="course-reviews section-space" aria-labelledby="reviews-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Retours vérifiés</span>
              <h2 id="reviews-title">Avis des participants</h2>
              <p>{reviews.nombre ? `${reviews.moyenne}/5 sur ${reviews.nombre} avis publié(s)` : "Aucun avis n’a encore été publié."}</p>
            </div>
            {reviews.nombre > 0 && <strong className="rating-summary"><Star size={21} fill="currentColor" /> {reviews.moyenne}</strong>}
          </div>
          {course.inscrit && currentUser()?.role === "PARTICIPANT" && !reviews.content.some((review) => review.proprietaire) && !editingReview && (
            <form className="surface-card review-form" onSubmit={submitReview}>
              <h3>Partager un avis</h3>
              <p>Le serveur vérifiera votre inscription, au moins 30 % de progression et l’absence de doublon.</p>
              <div className="form-grid">
                <label>Note
                  <select value={reviewNote} onChange={(event) => setReviewNote(Number(event.target.value))}>
                    {[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} / 5</option>)}
                  </select>
                </label>
                <label>Commentaire
                  <textarea required minLength={10} maxLength={2000} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} />
                </label>
              </div>
              <Button type="submit" loading={busy === "review"}>Publier mon avis</Button>
            </form>
          )}
          {editingReview && (
            <form className="surface-card review-form" onSubmit={submitReview}>
              <h3>Modifier mon avis</h3>
              <label>Note<select value={reviewNote} onChange={(event) => setReviewNote(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} / 5</option>)}</select></label>
              <label>Commentaire<textarea required minLength={10} maxLength={2000} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} /></label>
              <div className="form-actions"><Button type="submit" loading={busy === "review"}>Enregistrer</Button><Button type="button" variant="ghost" onClick={() => setEditingReview(null)}>Annuler</Button></div>
            </form>
          )}
          <div className="review-list">
            {reviews.content.map((review) => (
              <article className="surface-card" key={review.id}>
                <div className="row spread">
                  <div className="row">
                    <strong>{review.participant}</strong>
                    {review.proprietaire && review.statut !== "PUBLIE" && (
                      <Badge variant="warning">{review.statut === "SIGNALE" ? "En modération" : "Masqué"}</Badge>
                    )}
                  </div>
                  <span aria-label={`${review.note} sur 5`}>{"★".repeat(review.note)}{"☆".repeat(5 - review.note)}</span>
                </div>
                <p>{review.commentaire}</p>
                <small>{new Date(review.createdAt).toLocaleDateString("fr-FR")}</small>
                {review.reponseFormateur && <blockquote><strong>Réponse du formateur</strong>{review.reponseFormateur}</blockquote>}
                {review.proprietaire ? (
                  <div className="form-actions">
                    <Button size="sm" variant="secondary" onClick={() => {setEditingReview(review); setReviewNote(review.note); setReviewComment(review.commentaire);}}>Modifier</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteReview(review.id)}>Supprimer</Button>
                  </div>
                ) : currentUser()?.role === "PARTICIPANT" ? (
                  <button className="link-button" onClick={() => reportReview(review.id)}>Signaler cet avis</button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <Toast message={notice} onClose={() => setNotice("")} />
    </div>
  );
}
