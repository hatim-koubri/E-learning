"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Focus,
  ListTree,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  X,
} from "lucide-react";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {LearningResourceViewer} from "@/components/LearningResourceViewer";
import {LearningCourseOutline, LearningResourceIcon} from "@/components/LearningCourseOutline";
import {Protected} from "@/components/Protected";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Alert, Button, EmptyState, ErrorState, IconButton, ProgressBar, Skeleton, Toast, cn} from "@/components/ui";
import {api, apiBlob} from "@/lib/api";
import type {LearningJourney, PrivateNote} from "@/lib/engagement";
import {formatBytes, type ResourceType} from "@/lib/formations";
import type {EvaluationPlan, ProgressResponse, ResourceAccess} from "@/lib/learning";

type JourneyResource = LearningJourney["modules"][number]["chapitres"][number]["ressources"][number];
type ReaderItem = {
  moduleId: number;
  moduleTitle: string;
  chapterId: number;
  chapterTitle: string;
  chapterState: string;
  resource: JourneyResource;
};

function flattenJourney(journey: LearningJourney): ReaderItem[] {
  return journey.modules.flatMap((module) => module.chapitres.flatMap((chapter) =>
    chapter.ressources.map((resource) => ({
      moduleId: module.id,
      moduleTitle: module.titre,
      chapterId: chapter.id,
      chapterTitle: chapter.titre,
      chapterState: chapter.etat,
      resource,
    })),
  ));
}

function resourceLabel(type: ResourceType) {
  if (type === "PDF") return "Document PDF";
  if (type === "VIDEO") return "Vidéo uploadée";
  if (type === "YOUTUBE") return "Lien YouTube";
  return "Image pédagogique";
}

export default function LearningReaderPage() {
  const {formationId} = useParams<{formationId: string}>();
  const [journey, setJourney] = useState<LearningJourney | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationPlan | null>(null);
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [access, setAccess] = useState<ResourceAccess | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [bookmarkOverride, setBookmarkOverride] = useState<boolean | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const videoSeconds = useRef(0);
  const accessRequest = useRef(0);
  const bookmarkRequest = useRef(false);
  const outlineRef = useRef<HTMLElement>(null);

  const requestAccess = useCallback(async (resourceId: number) => {
    const requestId = ++accessRequest.current;
    setResourceLoading(true);
    setResourceError("");
    setAccess(null);
    try {
      const response = await api<ResourceAccess>(`/catalogue/${formationId}/ressources/${resourceId}/acces`);
      if (requestId === accessRequest.current) setAccess(response);
    } catch (reason) {
      if (requestId === accessRequest.current) setResourceError((reason as Error).message);
    } finally {
      if (requestId === accessRequest.current) setResourceLoading(false);
    }
  }, [formationId]);

  const load = useCallback(async () => {
    setPageLoading(true);
    setPageError("");
    try {
      const [journeyResponse, noteResponse, evaluationResponse] = await Promise.all([
        api<LearningJourney>(`/participant/formations/${formationId}/parcours`),
        api<PrivateNote[]>(`/participant/notes?formationId=${formationId}`),
        api<EvaluationPlan>(`/participant/formations/${formationId}/evaluations`),
      ]);
      setJourney(journeyResponse);
      setEvaluations(evaluationResponse);
      setNotes(noteResponse);
      const resources = flattenJourney(journeyResponse);
      const query = new URLSearchParams(window.location.search);
      const requestedResource = Number(query.get("ressource"));
      const requestedChapter = Number(query.get("chapitre"));
      const selected = resources.find((item) => item.resource.id === requestedResource && item.resource.etat !== "VERROUILLE")
        ?? resources.find((item) => item.chapterId === requestedChapter && item.resource.etat !== "VERROUILLE")
        ?? resources.find((item) => item.resource.etat !== "VERROUILLE")
        ?? null;
      setActiveResourceId(selected?.resource.id ?? null);
      const selectedNote = noteResponse.find((note) => note.ressourceId === selected?.resource.id);
      setNoteDraft(selectedNote?.contenu ?? "");
      if (selected) await requestAccess(selected.resource.id);
    } catch (reason) {
      setPageError((reason as Error).message);
    } finally {
      setPageLoading(false);
    }
  }, [formationId, requestAccess]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 900px)");
    const syncOutline = () => {
      setNarrow(media.matches);
      setOutlineOpen(!media.matches);
    };
    queueMicrotask(syncOutline);
    media.addEventListener("change", syncOutline);
    return () => media.removeEventListener("change", syncOutline);
  }, []);

  useEffect(() => {
    if (!narrow || !outlineOpen) return;
    const outline = outlineRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector = "button:not(:disabled), a[href], summary, [tabindex]:not([tabindex='-1'])";
    document.body.style.overflow = "hidden";
    queueMicrotask(() => outline?.querySelector<HTMLElement>(focusableSelector)?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOutlineOpen(false);
        return;
      }
      if (event.key !== "Tab" || !outline) return;
      const focusable = Array.from(outline.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [narrow, outlineOpen]);

  const resources = useMemo(() => journey ? flattenJourney(journey) : [], [journey]);
  const currentIndex = resources.findIndex((item) => item.resource.id === activeResourceId);
  const selected = currentIndex >= 0 ? resources[currentIndex] : null;
  const previous = currentIndex > 0 ? resources[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex + 1 < resources.length ? resources[currentIndex + 1] : null;
  const activeNotes = notes.filter((note) => note.ressourceId === activeResourceId);
  const activeBookmark = activeNotes.find((note) => note.signet);
  const editableNote = activeNotes.find((note) => Boolean(note.contenu));
  const bookmarked = bookmarkOverride ?? Boolean(activeBookmark);

  function choose(item: ReaderItem | null) {
    if (!item || item.resource.etat === "VERROUILLE") return;
    setActiveResourceId(item.resource.id);
    setNoteDraft(notes.find((note) => note.ressourceId === item.resource.id && note.contenu)?.contenu ?? "");
    setBookmarkOverride(null);
    setNotice("");
    videoSeconds.current = 0;
    setVideoFinished(false);
    window.history.replaceState(null, "", `/apprentissage/${formationId}?ressource=${item.resource.id}`);
    void requestAccess(item.resource.id);
    if (typeof window.matchMedia === "function" && window.matchMedia("(max-width: 900px)").matches) setOutlineOpen(false);
  }

  async function completeChapter() {
    if (!selected) return;
    setBusy("complete");
    setResourceError("");
    try {
      const response = await api<ProgressResponse>(`/participant/formations/${formationId}/chapitres/${selected.chapterId}/progression`, {
        method: "PUT",
        body: JSON.stringify({termine: true, positionVideoSecondes: videoSeconds.current}),
      });
      const refreshed = await api<LearningJourney>(`/participant/formations/${formationId}/parcours`);
      const refreshedEvaluations = await api<EvaluationPlan>(`/participant/formations/${formationId}/evaluations`);
      setJourney(refreshed);
      setEvaluations(refreshedEvaluations);
      setNotice(`Chapitre terminé. Votre progression atteint ${Math.round(response.pourcentage)} %.`);
    } catch (reason) {
      setResourceError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function downloadCertificate(){
    setBusy("certificate");setResourceError("");
    try{
      const blob=await apiBlob(`/participant/formations/${formationId}/certificat`);
      const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
      anchor.href=url;anchor.download=`certificat-khotwa-${formationId}.pdf`;anchor.click();URL.revokeObjectURL(url);
      setNotice("Votre certificat a été téléchargé.");
    }catch(reason){setResourceError((reason as Error).message)}finally{setBusy("")}
  }

  function mergeNote(updated: PrivateNote) {
    setNotes((current) => current.some((note) => note.id === updated.id)
      ? current.map((note) => note.id === updated.id ? updated : note)
      : [updated, ...current]);
  }

  async function saveNote() {
    if (!selected || !noteDraft.trim()) return;
    setBusy("note");
    try {
      const updated = await api<PrivateNote>(editableNote ? `/participant/notes/${editableNote.id}` : `/participant/formations/${formationId}/notes`, {
        method: editableNote ? "PUT" : "POST",
        body: JSON.stringify({
          chapitreId: selected.chapterId,
          ressourceId: selected.resource.id,
          contenu: noteDraft.trim(),
          signet: editableNote?.signet ?? false,
        }),
      });
      mergeNote(updated);
      setNotice("Note privée enregistrée.");
    } catch (reason) {
      setResourceError((reason as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function toggleBookmark() {
    if (!selected || bookmarkRequest.current) return;
    bookmarkRequest.current = true;
    const previous = notes;
    const adding = !Boolean(activeBookmark);
    setBookmarkOverride(adding);
    setBusy("bookmark");
    try {
      if (adding) {
        const updated = await api<PrivateNote>(`/participant/formations/${formationId}/notes`, {
          method: "POST",
          body: JSON.stringify({
            chapitreId: selected.chapterId,
            ressourceId: selected.resource.id,
            contenu: null,
            signet: true,
          }),
        });
        mergeNote(updated);
        setNotice("Signet privé ajouté.");
      } else if (activeBookmark?.contenu) {
        const updated = await api<PrivateNote>(`/participant/notes/${activeBookmark.id}`, {
          method: "PUT",
          body: JSON.stringify({
            chapitreId: selected.chapterId,
            ressourceId: selected.resource.id,
            contenu: activeBookmark.contenu,
            signet: false,
          }),
        });
        mergeNote(updated);
        setNotice("Signet retiré.");
      } else if (activeBookmark) {
        await api(`/participant/notes/${activeBookmark.id}`, {method: "DELETE"});
        setNotes((current) => current.filter((note) => note.id !== activeBookmark.id));
        setNotice("Signet retiré.");
      }
    } catch (reason) {
      setNotes(previous);
      setResourceError((reason as Error).message);
    } finally {
      setBookmarkOverride(null);
      bookmarkRequest.current = false;
      setBusy("");
    }
  }

  return (
    <Protected role="PARTICIPANT">
      <div className={cn("learning-reader-page", readingMode && "reading-mode", !outlineOpen && "outline-collapsed")}>
        <header className="reader-topbar" aria-hidden={narrow && outlineOpen || undefined} inert={narrow && outlineOpen}>
          <div className="reader-topbar-start">
            <IconButton label={outlineOpen ? "Masquer le plan du cours" : "Afficher le plan du cours"} onClick={() => setOutlineOpen((current) => !current)}>
              {outlineOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
            </IconButton>
            <Link className="reader-back" href={`/catalogue/${formationId}`}><ArrowLeft size={17} /><span>Retour à la formation</span></Link>
          </div>
          <div className="reader-course-progress">
            <div><span>Cours</span><strong>{journey?.titre ?? "Chargement…"}</strong></div>
            <ProgressBar value={journey?.progression ?? 0} label="Progression du cours" />
          </div>
          <div className="reader-topbar-actions">
            <IconButton
              label={bookmarked ? "Retirer le signet" : "Ajouter un signet"}
              aria-pressed={bookmarked}
              aria-busy={busy === "bookmark" || undefined}
              disabled={!selected || busy === "bookmark"}
              onClick={toggleBookmark}
            >
              <Bookmark className={bookmarked ? "filled-icon" : undefined} size={19} />
            </IconButton>
            <IconButton label={readingMode ? "Quitter le mode lecture" : "Activer le mode lecture"} aria-pressed={readingMode} onClick={() => setReadingMode((current) => !current)}>
              {readingMode ? <X size={19} /> : <Focus size={19} />}
            </IconButton>
            <ThemeToggle />
          </div>
        </header>

        {outlineOpen && <button className="reader-outline-overlay" aria-hidden="true" tabIndex={-1} onClick={() => setOutlineOpen(false)} />}
        <div className="reader-layout">
          <aside
            aria-hidden={narrow && !outlineOpen || undefined}
            aria-label={narrow && outlineOpen ? "Menu du plan du cours" : "Plan du cours"}
            aria-modal={narrow && outlineOpen || undefined}
            className={cn("reader-outline", outlineOpen && "open")}
            inert={narrow && !outlineOpen}
            ref={outlineRef}
            role={narrow && outlineOpen ? "dialog" : undefined}
          >
            <div className="reader-outline-heading">
              <div><ListTree size={19} /><strong>Plan du cours</strong></div>
              <IconButton label="Replier le plan" onClick={() => setOutlineOpen(false)}><ChevronLeft size={18} /></IconButton>
            </div>
            <LearningCourseOutline
              formationId={formationId}
              journey={journey}
              evaluations={evaluations}
              activeResourceId={activeResourceId}
              certificateBusy={busy==="certificate"}
              onDownloadCertificate={downloadCertificate}
              onSelectResource={(module,chapter,resource)=>choose({moduleId:module.id,moduleTitle:module.titre,chapterId:chapter.id,chapterTitle:chapter.titre,chapterState:chapter.etat,resource})}
            />
          </aside>

          <main className="reader-main" id="contenu-principal" aria-hidden={narrow && outlineOpen || undefined} inert={narrow && outlineOpen}>
            {pageLoading && <div className="reader-loading" role="status"><Skeleton className="skeleton-line medium" /><Skeleton className="reader-stage-skeleton" /></div>}
            {pageError && <ErrorState title="Impossible de charger votre cours" message={pageError} onRetry={load} />}
            {!pageLoading && journey && resources.length === 0 && (
              <EmptyState
                title="Aucune ressource disponible"
                description="Le formateur n’a pas encore ajouté de ressource à ce module. Revenez plus tard ou consultez une autre formation."
                action={<Link className="btn btn-secondary" href={`/catalogue/${formationId}`}>Retour à la formation</Link>}
              />
            )}
            {selected && (
              <div className="reader-resource-transition" key={selected.resource.id}>
                <header className="reader-resource-header">
                  <div>
                    <span className="resource-kicker"><LearningResourceIcon type={selected.resource.type} /> {resourceLabel(selected.resource.type)}</span>
                    <h1>{selected.resource.titre}</h1>
                    <p>{selected.moduleTitle} <span aria-hidden="true">•</span> {selected.chapterTitle}</p>
                    {access && (
                      <div className="resource-metadata">
                        {access.taille != null && <span>{formatBytes(access.taille)}</span>}
                        {access.typeMime && <span>{access.typeMime}</span>}
                        {access.type !== "YOUTUBE" && <span>Lien sécurisé · {Math.max(1, Math.round(access.expiresInSeconds / 60))} min</span>}
                      </div>
                    )}
                  </div>
                  {access && access.type !== "YOUTUBE" && (
                    <div className="reader-resource-actions">
                      <a className="btn btn-ghost btn-sm" href={access.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} /> Ouvrir dans un nouvel onglet
                      </a>
                      {access.telechargeable && (
                        <a className="btn btn-secondary btn-sm" href={access.url} download target="_blank" rel="noopener noreferrer">
                          <Download size={16} /> Télécharger
                        </a>
                      )}
                    </div>
                  )}
                </header>

                {resourceLoading && <div className="reader-stage-loading" role="status"><Skeleton className="reader-stage-skeleton" /><span>Préparation de la ressource sécurisée…</span></div>}
                {resourceError && <ErrorState title="Impossible de charger cette ressource" message={resourceError} onRetry={() => requestAccess(selected.resource.id)} />}
                {access && !resourceLoading && (
                  <LearningResourceViewer
                    access={access}
                    title={selected.resource.titre}
                    onRetry={() => requestAccess(selected.resource.id)}
                    onVideoProgress={(seconds) => {videoSeconds.current = seconds;}}
                    onVideoEnded={() => setVideoFinished(true)}
                    key={access.url}
                  />
                )}

                <section className="reader-notes" aria-labelledby="reader-notes-title">
                  <div className="reader-notes-heading">
                    <div><NotebookPen size={20} /><div><h2 id="reader-notes-title">Notes personnelles</h2><p>Privées et visibles uniquement par vous.</p></div></div>
                    {editableNote?.updatedAt && <small>Enregistré le {new Date(editableNote.updatedAt).toLocaleDateString("fr-FR")}</small>}
                  </div>
                  <label>
                    <span className="sr-only">Ma note privée pour cette ressource</span>
                    <textarea value={noteDraft} maxLength={5000} placeholder="Résumé, idée importante ou question à retenir…" onChange={(event) => setNoteDraft(event.target.value)} />
                  </label>
                  <div className="reader-notes-actions">
                    <Button variant="secondary" disabled={!noteDraft.trim()} loading={busy === "note"} onClick={saveNote}><Save size={16} /> Enregistrer la note</Button>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>

        {selected && (
          <nav className="reader-bottom-nav" aria-label="Navigation entre les ressources" aria-hidden={narrow && outlineOpen || undefined} inert={narrow && outlineOpen}>
            <Button aria-label={`Précédent : ${previous?.resource.titre ?? "début du cours"}`} variant="secondary" disabled={!previous || previous.resource.etat === "VERROUILLE"} onClick={() => choose(previous)}>
              <ChevronLeft aria-hidden="true" size={18} /><span><small>Précédent</small>{previous?.resource.titre ?? "Début du cours"}</span>
            </Button>
            <Button
              className="reader-complete-action"
              disabled={selected.chapterState === "TERMINE" || selected.resource.type === "VIDEO" && !videoFinished}
              loading={busy === "complete"}
              onClick={completeChapter}
            >
              <CheckCircle2 size={18} /> {selected.chapterState === "TERMINE" ? "Chapitre terminé" : selected.resource.type === "VIDEO" && !videoFinished ? "Terminez la vidéo" : "Marquer comme terminé"}
            </Button>
            <Button aria-label={`Suivant : ${next?.resource.titre ?? "fin du cours"}`} variant="secondary" disabled={!next || next.resource.etat === "VERROUILLE"} onClick={() => choose(next)}>
              <span><small>Suivant</small>{next?.resource.titre ?? "Fin du cours"}</span><ChevronRight aria-hidden="true" size={18} />
            </Button>
          </nav>
        )}
        <Toast message={notice} onClose={() => setNotice("")} />
      </div>
    </Protected>
  );
}
