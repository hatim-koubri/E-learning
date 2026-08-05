import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {PdfReader} from "@/components/PdfReader";

const pdfMock = vi.hoisted(() => {
  const render = vi.fn(() => ({promise: Promise.resolve(), cancel: vi.fn()}));
  const getPage = vi.fn(async () => ({
    getViewport: ({scale}: {scale: number}) => ({width: 600 * scale, height: 800 * scale}),
    render,
  }));
  const document = {numPages: 3, getPage};
  const getDocument = vi.fn(() => ({promise: Promise.resolve(document), destroy: vi.fn(async () => undefined)}));
  return {document, getDocument, getPage, render};
});

vi.mock("pdfjs-dist", () => ({GlobalWorkerOptions: {workerSrc: ""}, getDocument: pdfMock.getDocument}));

describe("lecteur PDF.js", () => {
  beforeEach(() => {
    pdfMock.getDocument.mockReset();
    pdfMock.getDocument.mockImplementation(() => ({promise: Promise.resolve(pdfMock.document), destroy: vi.fn(async () => undefined)}));
    pdfMock.getPage.mockClear();
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {configurable: true, value: vi.fn(async () => undefined)});
    Object.defineProperty(document, "exitFullscreen", {configurable: true, value: vi.fn(async () => undefined)});
    Object.defineProperty(document, "fullscreenElement", {configurable: true, value: null});
  });

  it("charge en ajustement largeur et rend pagination, zoom et miniatures fonctionnels", async () => {
    const user = userEvent.setup();
    render(<PdfReader url="https://minio.test/support.pdf?signature=one" title="Support" onRetry={vi.fn()} />);

    expect(screen.getByRole("button", {name: "Ajuster à la largeur"})).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(pdfMock.getPage).toHaveBeenCalledWith(1));
    await user.click(screen.getByRole("button", {name: "Page suivante"}));
    await waitFor(() => expect(pdfMock.getPage).toHaveBeenCalledWith(2));
    expect(screen.getByLabelText("Numéro de page")).toHaveValue(2);

    await user.click(screen.getByRole("button", {name: "Zoom avant"}));
    expect(screen.getByText("115 %")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Afficher les miniatures"}));
    expect(screen.getByRole("complementary", {name: "Miniatures du document"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Afficher la page 3"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Afficher en plein écran"}));
    expect(HTMLElement.prototype.requestFullscreen).toHaveBeenCalled();
  });

  it("affiche une erreur et demande une nouvelle URL temporaire", async () => {
    const retry = vi.fn();
    pdfMock.getDocument.mockImplementationOnce(() => ({promise: Promise.reject(new Error("expired")), destroy: vi.fn(async () => undefined)}));
    const user = userEvent.setup();
    render(<PdfReader url="https://minio.test/expired.pdf" title="Support expiré" onRetry={retry} />);

    expect(await screen.findByRole("heading", {name: "Impossible d’afficher le PDF"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Réessayer avec un nouveau lien"}));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("utilise un plein écran CSS de repli quand l’API native est absente", async () => {
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {configurable: true, value: undefined});
    const user = userEvent.setup();
    render(<PdfReader url="https://minio.test/support.pdf?signature=fallback" title="Support" onRetry={vi.fn()} />);
    await waitFor(() => expect(pdfMock.getPage).toHaveBeenCalledWith(1));

    await user.click(screen.getByRole("button", {name: "Afficher en plein écran"}));
    expect(document.querySelector(".pdf-reader")).toHaveClass("fullscreen-fallback");
    expect(screen.getByRole("button", {name: "Quitter le plein écran"})).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(document.querySelector(".pdf-reader")).not.toHaveClass("fullscreen-fallback");
  });
});
