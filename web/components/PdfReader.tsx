"use client";

import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileWarning,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Rows3,
} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import type {PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask} from "pdfjs-dist";
import {Button, IconButton, Skeleton, cn} from "@/components/ui";

type FitMode = "width" | "page" | "custom";

function PdfThumbnail({
  document,
  pageNumber,
  active,
  onSelect,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    void document.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({scale: 1});
      const viewport = page.getViewport({scale: Math.min(1, 118 / base.width)});
      const canvas = canvasRef.current;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({canvas, viewport});
      return renderTask.promise;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return (
    <button
      type="button"
      className={cn("pdf-thumbnail", active && "active")}
      aria-label={`Afficher la page ${pageNumber}`}
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <span>{pageNumber}</span>
    </button>
  );
}

export function PdfReader({url, title, onRetry}: {url: string; title: string; onRetry: () => void}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({width: 900, height: 680});
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [thumbnails, setThumbnails] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenFallback, setFullscreenFallback] = useState(false);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const update = () => setSize({
      width: Math.max(280, element.clientWidth),
      height: Math.max(420, element.clientHeight),
    });
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
      setPdfDocument(null);
      setPageNumber(1);
      setFitMode("width");
    });
    void import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      loadingTask = pdfjs.getDocument({url, withCredentials: false});
      return loadingTask.promise;
    }).then((loaded) => {
      if (!cancelled) setPdfDocument(loaded);
    }).catch(() => {
      if (!cancelled) setError("Le document PDF n’a pas pu être chargé. Le lien sécurisé a peut-être expiré.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let cancelled = false;
    let task: RenderTask | null = null;
    setRendering(true);
    void pdfDocument.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({scale: 1});
      const widthScale = Math.max(.25, (size.width - 32) / base.width);
      const pageScale = Math.max(.25, Math.min(widthScale, (size.height - 32) / base.height));
      const scale = fitMode === "width" ? widthScale : fitMode === "page" ? pageScale : zoom;
      const viewport = page.getViewport({scale});
      const canvas = canvasRef.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;
      task = page.render({canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]});
      return task.promise;
    }).catch((reason: {name?: string}) => {
      if (!cancelled && reason?.name !== "RenderingCancelledException") {
        setError("Cette page du PDF n’a pas pu être affichée.");
      }
    }).finally(() => {
      if (!cancelled) setRendering(false);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdfDocument, fitMode, pageNumber, size, zoom]);

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!fullscreenFallback) return;
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreenFallback(false);
    };
    document.addEventListener("keydown", exitOnEscape);
    return () => document.removeEventListener("keydown", exitOnEscape);
  }, [fullscreenFallback]);

  const changeZoom = useCallback((delta: number) => {
    setFitMode("custom");
    setZoom((current) => Math.min(3, Math.max(.5, Number((current + delta).toFixed(2)))));
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (fullscreenFallback) setFullscreenFallback(false);
    else if (typeof shellRef.current?.requestFullscreen === "function") {
      try {
        await shellRef.current.requestFullscreen();
      } catch {
        setFullscreenFallback(true);
      }
    } else setFullscreenFallback(true);
  }

  const pages = pdfDocument?.numPages ?? 0;
  const isFullscreen = fullscreen || fullscreenFallback;
  return (
    <div className={cn("pdf-reader", fullscreenFallback && "fullscreen-fallback")} ref={shellRef}>
      <div className="pdf-toolbar" aria-label="Contrôles du lecteur PDF">
        <div className="pdf-toolbar-group">
          <IconButton label={thumbnails ? "Masquer les miniatures" : "Afficher les miniatures"} onClick={() => setThumbnails((current) => !current)}>
            <Columns3 size={18} />
          </IconButton>
          <Button size="sm" variant={fitMode === "width" ? "primary" : "ghost"} aria-pressed={fitMode === "width"} onClick={() => setFitMode("width")}>
            <Rows3 size={17} /> Ajuster à la largeur
          </Button>
          <Button size="sm" variant={fitMode === "page" ? "primary" : "ghost"} aria-pressed={fitMode === "page"} onClick={() => setFitMode("page")}>
            Ajuster à la page
          </Button>
        </div>
        <div className="pdf-toolbar-group">
          <IconButton label="Zoom arrière" disabled={!pdfDocument || zoom <= .5} onClick={() => changeZoom(-.15)}><Minus size={18} /></IconButton>
          <span className="pdf-zoom" aria-live="polite">{fitMode === "custom" ? `${Math.round(zoom * 100)} %` : fitMode === "width" ? "Largeur" : "Page"}</span>
          <IconButton label="Zoom avant" disabled={!pdfDocument || zoom >= 3} onClick={() => changeZoom(.15)}><Plus size={18} /></IconButton>
        </div>
        <div className="pdf-toolbar-group">
          <IconButton label="Page précédente" disabled={pageNumber <= 1} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}><ChevronLeft size={18} /></IconButton>
          <label className="pdf-page-field">
            <span className="sr-only">Numéro de page</span>
            <input
              aria-label="Numéro de page"
              type="number"
              min={1}
              max={Math.max(1, pages)}
              value={pageNumber}
              disabled={!pdfDocument}
              onChange={(event) => setPageNumber(Math.min(Math.max(1, Number(event.target.value) || 1), Math.max(1, pages)))}
            />
            <span>/ {pages || "—"}</span>
          </label>
          <IconButton label="Page suivante" disabled={!pdfDocument || pageNumber >= pages} onClick={() => setPageNumber((current) => Math.min(pages, current + 1))}><ChevronRight size={18} /></IconButton>
          <IconButton label={isFullscreen ? "Quitter le plein écran" : "Afficher en plein écran"} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </IconButton>
        </div>
      </div>

      <div className={cn("pdf-workspace", thumbnails && "with-thumbnails")}>
        {thumbnails && pdfDocument && (
          <aside className="pdf-thumbnails" aria-label="Miniatures du document">
            {Array.from({length: pages}, (_, index) => index + 1).map((number) => (
              <PdfThumbnail
                document={pdfDocument}
                pageNumber={number}
                active={number === pageNumber}
                onSelect={() => setPageNumber(number)}
                key={number}
              />
            ))}
          </aside>
        )}
        <div className="pdf-viewport" ref={viewportRef} tabIndex={0} aria-label={`Document ${title}, page ${pageNumber} sur ${pages || 1}`}>
          {(loading || rendering) && <div className="pdf-loading" role="status"><Skeleton className="pdf-page-skeleton" /><span>{loading ? "Chargement du document…" : "Affichage de la page…"}</span></div>}
          {error ? (
            <div className="pdf-error" role="alert">
              <FileWarning size={32} />
              <h3>Impossible d’afficher le PDF</h3>
              <p>{error}</p>
              <Button onClick={onRetry}>Réessayer avec un nouveau lien</Button>
            </div>
          ) : <canvas className={cn("pdf-canvas", (loading || rendering) && "loading")} ref={canvasRef} />}
        </div>
      </div>
    </div>
  );
}
