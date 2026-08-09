"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Focus,
  ListTree,
  LockKeyhole,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PlaySquare,
  Save,
  Video,
  X,
} from "lucide-react";
import {useParams} from "next/navigation";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {LearningResourceViewer} from "@/components/LearningResourceViewer";
import {Protected} from "@/components/Protected";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Alert, Button, EmptyState, ErrorState, IconButton, ProgressBar, Skeleton, Toast, cn} from "@/components/ui";
import {api} from "@/lib/api";
import type {LearningJourney, PrivateNote} from "@/lib/engagement";
import {formatBytes, type ResourceType} from "@/lib/formations";
import type {ProgressResponse, ResourceAccess} from "@/lib/learning";

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

function ResourceIcon({type}: {type: ResourceType}) {
  if (type === "PDF") return <FileText aria-hidden="true" size={17} />;
  if (type === "VIDEO") return <Video aria-hidden="true" size={17} />;
  if (type === "YOUTUBE") return <PlaySquare aria-hidden="true" size={17} />;
  return <FileImage aria-hidden="true" size={17} />;
}

function StatusIcon({state}: {state: string}) {
  if (state === "TERMINE") return <Check aria-label="Terminé" size={15} />;
  if (state === "VERROUILLE") return <LockKeyhole aria-label="Verrouillé" size={15} />;
  return <BookOpen aria-label="Disponible" size={15} />;
}

export default function LearningReaderPage() {
  const {formationId} = useParams<{formationId: string}>();
  const [journey, setJourney] = useState<LearningJourney | null>(null);
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [activeResourceId, setActiveResourceId] = useState<number | null>(null);
  const [access, setAccess] = useState<ResourceAccess | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [resourceError, setResourceError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [narrow, setNarrow] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const videoSeconds = useRef(0);
  const accessRequest = useRef(0);
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
      const [journeyResponse, noteResponse] = await Promise.all([
        api<LearningJourney>(`/participant/formations/${formationId}/parcours`),
        api<PrivateNote[]>(`/participant/notes?formationId=${formationId}`),
      ]);
      setJourney(journeyResponse);
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
  const activeNote = notes.find((note) => note.ressourceId === activeResourceId);

  function choose(item: ReaderItem | null) {
    if (!item || item.resource.etat === "VERROUILLE") return;
    setActiveResourceId(item.resource.id);
    setNoteDraft(notes.find((note) => note.ressourceId === item.resource.id)?.contenu ?? "");
    setNotice("");
    videoSeconds.current = 0;
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
      setJourney(refreshed);
      setNotice(`Chapitre terminé. Votre progression atteint ${Math.round(response.pourcentage)} %.`);
    } catch (reason) {
      setResourceError((reason as Error).message);
    } finally {
      setBusy("");
    }
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
      const updated = await api<PrivateNote>(activeNote ? `/participant/notes/${activeNote.id}` : `/participant/formations/${formationId}/notes`, {
        method: activeNote ? "PUT" : "POST",
        body: JSON.stringify({
          chapitreId: selected.chapterId,
          ressourceId: selected.resource.id,
          contenu: noteDraft.trim(),
          signet: activeNote?.signet ?? false,
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
    if (!selected) return;
    setBusy("bookmark");
    try {
      const updated = await api<PrivateNote>(activeNote ? `/participant/notes/${activeNote.id}` : `/participant/formations/${formationId}/notes`, {
        method: activeNote ? "PUT" : "POST",
        body: JSON.stringify({
          chapitreId: selected.chapterId,
          ressourceId: selected.resource.id,
          contenu: activeNote?.contenu ?? null,
          signet: !activeNote?.signet,
        }),
      });
      mergeNote(updated);
      setNotice(updated.signet ? "Signet privé ajouté." : "Signet retiré.");
    } catch (reason) {
      setResourceError((reason as Error).message);
    } finally {
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
              label={activeNote?.signet ? "Retirer le signet" : "Ajouter un signet"}
              aria-pressed={Boolean(activeNote?.signet)}
              aria-busy={busy === "bookmark" || undefined}
              disabled={!selected || busy === "bookmark"}
              onClick={toggleBookmark}
            >
              <Bookmark className={activeNote?.signet ? "filled-icon" : undefined} size={19} />
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
            <nav>
              {journey?.modules.map((module, moduleIndex) => (
                <details className="reader-module" open={module.chapitres.some((chapter) => chapter.ressources.some((resource) => resource.id === activeResourceId)) || moduleIndex === 0 || undefined} key={module.id}>
                  <summary>
                    <span>{String(moduleIndex + 1).padStart(2, "0")}</span>
                    <strong>{module.titre}</strong>
                    <StatusIcon state={module.etat} />
                  </summary>
                  {module.chapitres.length === 0 && <p className="reader-outline-empty">Aucun chapitre disponible</p>}
                  {module.chapitres.map((chapter) => (
                    <section className="reader-chapter" key={chapter.id}>
                      <div className="reader-chapter-title"><StatusIcon state={chapter.etat} /><strong>{chapter.titre}</strong></div>
                      {chapter.ressources.length === 0 && <p className="reader-outline-empty">Aucune ressource</p>}
                      {chapter.ressources.map((resource) => (
                        <button
                          type="button"
                          className={cn("reader-resource-link", resource.id === activeResourceId && "active")}
                          aria-current={resource.id === activeResourceId ? "page" : undefined}
                          disabled={resource.etat === "VERROUILLE"}
                          onClick={() => choose({moduleId: module.id, moduleTitle: module.titre, chapterId: chapter.id, chapterTitle: chapter.titre, chapterState: chapter.etat, resource})}
                          key={resource.id}
                        >
                          <ResourceIcon type={resource.type} />
                          <span>{resource.titre}</span>
                          <StatusIcon state={resource.etat} />
                        </button>
                      ))}
                    </section>
                  ))}
                </details>
              ))}
            </nav>
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
                    <span className="resource-kicker"><ResourceIcon type={selected.resource.type} /> {resourceLabel(selected.resource.type)}</span>
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
                    key={access.url}
                  />
                )}

                <section className="reader-notes" aria-labelledby="reader-notes-title">
                  <div className="reader-notes-heading">
                    <div><NotebookPen size={20} /><div><h2 id="reader-notes-title">Notes personnelles</h2><p>Privées et visibles uniquement par vous.</p></div></div>
                    {activeNote?.updatedAt && <small>Enregistré le {new Date(activeNote.updatedAt).toLocaleDateString("fr-FR")}</small>}
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
              disabled={selected.chapterState === "TERMINE"}
              loading={busy === "complete"}
              onClick={completeChapter}
            >
              <CheckCircle2 size={18} /> {selected.chapterState === "TERMINE" ? "Chapitre terminé" : "Marquer comme terminé"}
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
