"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CirclePlay,
  Clock3,
  FileImage,
  FileText,
  Globe2,
  GraduationCap,
  LockKeyhole,
  PlaySquare,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {useParams, useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {levelLabel} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {Alert, Badge, Button, ErrorState, IconButton, PageSkeleton, Toast} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
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

  const load = useCallback(async () => {
    setError("");
    try {
      setCourse(await api<CatalogueDetail>(`/catalogue/${id}`));
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
      setNotice("Chapitre marqué comme terminé. Votre progression a été mise à jour.");
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy("");
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
              <span><GraduationCap size={18} /> {course.formateur}</span>
              <span><Globe2 size={18} /> {course.langue.toUpperCase()}</span>
              <span><BookOpen size={18} /> {course.nombreModules} modules</span>
            </div>
            <div className="price">{course.prix === 0 ? "Gratuite" : `${course.prix} ${course.devise}`}</div>
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
                      <div className="resource-list">
                        {chapter.ressources.map((resource) => {
                          const Icon = resourceIcon(resource.type);
                          return (
                            <button
                              className="resource-open"
                              disabled={resource.verrouille || busy === `resource-${resource.id}`}
                              onClick={() => open(resource.id)}
                              key={resource.id}
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
      </main>
      <Footer />
      <Toast message={notice} onClose={() => setNotice("")} />
    </div>
  );
}
