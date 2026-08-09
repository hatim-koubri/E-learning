import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import LearningReaderPage from "@/app/apprentissage/[formationId]/page";
import {api, currentUser} from "@/lib/api";
import type {LearningJourney, PrivateNote} from "@/lib/engagement";

const replace = vi.fn();
vi.mock("next/navigation", () => ({useParams: () => ({formationId: "7"}), useRouter: () => ({replace})}));
vi.mock("@/lib/api", () => ({api: vi.fn(), currentUser: vi.fn()}));
vi.mock("next/image", () => ({default: ({alt = ""}: {alt?: string}) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-testid="next-image" />}));
vi.mock("@/components/PdfReader", () => ({PdfReader: ({url, onRetry}: {url: string; onRetry: () => void}) => <div data-testid="pdf-reader"><span>{url}</span><button onClick={onRetry}>Renouveler le PDF</button></div>}));

const apiMock = vi.mocked(api);
const currentUserMock = vi.mocked(currentUser);
const participant = {id: 3, nom: "Nora", email: "nora@test.local", role: "PARTICIPANT" as const, statut: "ACTIF", createdAt: "2026-01-01"};

const journey: LearningJourney = {
  formationId: 7,
  titre: "Architecture Java durable",
  progression: 25,
  modules: [
    {id: 1, titre: "Fondations", etat: "DISPONIBLE", progression: 0, chapitres: [
      {id: 10, titre: "Principes", etat: "DISPONIBLE", progression: 0, ressources: [
        {id: 101, titre: "Guide PDF", type: "PDF", etat: "DISPONIBLE"},
        {id: 102, titre: "Vidéo externe", type: "YOUTUBE", etat: "DISPONIBLE"},
      ]},
    ]},
    {id: 2, titre: "Pratique", etat: "VERROUILLE", progression: 0, chapitres: [
      {id: 20, titre: "Atelier", etat: "VERROUILLE", progression: 0, ressources: [
        {id: 201, titre: "Démonstration uploadée", type: "VIDEO", etat: "VERROUILLE"},
      ]},
    ]},
    {id: 3, titre: "À venir", etat: "DISPONIBLE", progression: 0, chapitres: []},
  ],
};

function accessFor(resourceId: number) {
  if (resourceId === 101) return {resourceId, type: "PDF", url: "https://minio.test/guide.pdf?signature=fresh", expiresInSeconds: 300, telechargeable: true, titre: "Guide PDF", typeMime: "application/pdf", taille: 4096};
  if (resourceId === 102) return {resourceId, type: "YOUTUBE", url: "https://youtube.com/shorts/abc123XYZ_-?feature=share", expiresInSeconds: 0, telechargeable: false, titre: "Vidéo externe", typeMime: null, taille: null};
  return {resourceId, type: "VIDEO", url: "https://minio.test/demo.mp4?signature=fresh", expiresInSeconds: 300, telechargeable: false, titre: "Démonstration uploadée", typeMime: "video/mp4", taille: 8192};
}

function installApi(custom?: (path: string, options?: RequestInit) => unknown) {
  apiMock.mockImplementation(async (path, options) => {
    const overridden = custom?.(path, options);
    if (overridden !== undefined) return await overridden;
    if (path === "/participant/formations/7/parcours") return journey;
    if (path === "/participant/notes?formationId=7") return [];
    const match = path.match(/\/ressources\/(\d+)\/acces/);
    if (match) return accessFor(Number(match[1]));
    return {};
  });
}

describe("lecteur de cours", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentUserMock.mockReturnValue(participant);
    replace.mockReset();
    localStorage.setItem("user", JSON.stringify(participant));
    window.history.replaceState(null, "", "/apprentissage/7");
    Object.defineProperty(window, "matchMedia", {configurable: true, value: vi.fn(() => ({matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn()}))});
  });

  it("organise le PDF, la navigation et le téléchargement autorisé", async () => {
    installApi();
    render(<LearningReaderPage />);

    expect(await screen.findByRole("heading", {name: "Guide PDF"})).toBeInTheDocument();
    expect(screen.getByTestId("pdf-reader")).toHaveTextContent("signature=fresh");
    expect(screen.getByRole("link", {name: /Télécharger/})).toHaveAttribute("href", "https://minio.test/guide.pdf?signature=fresh");
    expect(screen.getByRole("button", {name: /Précédent/})).toBeDisabled();
    expect(screen.getByRole("button", {name: /Suivant.*Vidéo externe/})).toBeEnabled();
    expect(screen.getByText("À venir")).toBeInTheDocument();
    expect(screen.getByText("Aucun chapitre disponible")).toBeInTheDocument();
  });

  it("normalise YouTube et ouvre la destination sans accès à la fenêtre source", async () => {
    installApi();
    const user = userEvent.setup();
    render(<LearningReaderPage />);
    await screen.findByRole("heading", {name: "Guide PDF"});
    await user.click(screen.getByRole("button", {name: /Suivant.*Vidéo externe/}));

    const link = await screen.findByRole("link", {name: /Regarder sur YouTube/});
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=abc123XYZ_-");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
  });

  it("renouvelle une URL expirée lorsque Réessayer est activé", async () => {
    let accessCalls = 0;
    installApi((path) => {
      if (path === "/catalogue/7/ressources/101/acces") {
        accessCalls += 1;
        if (accessCalls === 1) return Promise.reject(new Error("Lien expiré"));
        return accessFor(101);
      }
    });
    const user = userEvent.setup();
    render(<LearningReaderPage />);

    expect(await screen.findByRole("heading", {name: "Impossible de charger cette ressource"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Réessayer"}));
    expect(await screen.findByTestId("pdf-reader")).toBeInTheDocument();
    expect(accessCalls).toBe(2);
  });

  it("enregistre la note privée et le signet sur la ressource active", async () => {
    let note: PrivateNote | null = null;
    let savedContent = "";
    installApi((path, options) => {
      if (path === "/participant/formations/7/notes" && options?.method === "POST") {
        const body = JSON.parse(String(options.body));
        note = {id: 9, formationId: 7, formationTitre: journey.titre, chapitreId: 10, chapitreTitre: "Principes", ressourceId: 101, ressourceTitre: "Guide PDF", contenu: body.contenu ?? undefined, signet: body.signet, createdAt: "2026-08-01", updatedAt: "2026-08-01"};
        return note;
      }
      if (path === "/participant/notes/9" && options?.method === "PUT") {
        const body = JSON.parse(String(options.body));
        savedContent = body.contenu ?? "";
        note = {...note!, contenu: body.contenu ?? undefined, signet: body.signet};
        return note;
      }
    });
    const user = userEvent.setup();
    render(<LearningReaderPage />);
    await screen.findByRole("heading", {name: "Guide PDF"});

    await user.click(screen.getByRole("button", {name: "Ajouter un signet"}));
    expect(await screen.findByRole("button", {name: "Retirer le signet"})).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Ma note privée pour cette ressource"), "À retenir");
    await user.click(screen.getByRole("button", {name: "Enregistrer la note"}));
    expect(await screen.findByText("Note privée enregistrée.")).toBeInTheDocument();
    expect(savedContent).toBe("À retenir");
  });

  it("replie le plan sur mobile et distingue une vidéo uploadée", async () => {
    const videoJourney: LearningJourney = {...journey, modules: [{id: 2, titre: "Pratique", etat: "DISPONIBLE", progression: 0, chapitres: [{id: 20, titre: "Atelier", etat: "DISPONIBLE", progression: 0, ressources: [{id: 201, titre: "Démonstration uploadée", type: "VIDEO", etat: "DISPONIBLE"}]}]}]};
    Object.defineProperty(window, "matchMedia", {configurable: true, value: vi.fn(() => ({matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()}))});
    installApi((path) => path === "/participant/formations/7/parcours" ? videoJourney : undefined);
    const user = userEvent.setup();
    render(<LearningReaderPage />);

    expect(await screen.findByRole("heading", {name: "Démonstration uploadée"})).toBeInTheDocument();
    expect(document.querySelector("video")).toHaveAttribute("src", "https://minio.test/demo.mp4?signature=fresh");
    expect(screen.getByRole("button", {name: "Lire la vidéo"})).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Position de lecture"})).toBeInTheDocument();
    expect(screen.getByRole("slider", {name: "Volume"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Afficher en plein écran"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Précédent : début du cours"})).toBeDisabled();
    expect(screen.getByRole("button", {name: "Suivant : fin du cours"})).toBeDisabled();
    expect(screen.queryByRole("link", {name: /Regarder sur YouTube/})).not.toBeInTheDocument();
    const outline = document.querySelector(".reader-outline");
    expect(outline).toHaveAttribute("inert");
    expect(outline).toHaveAttribute("aria-hidden", "true");
    const openPlan = await screen.findByRole("button", {name: "Afficher le plan du cours"});
    await user.click(openPlan);
    expect(outline).not.toHaveAttribute("inert");
    expect(outline).toHaveAttribute("role", "dialog");
    expect(screen.getByRole("button", {name: "Masquer le plan du cours", hidden: true})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Replier le plan"})).toBeInTheDocument();
  });

  it("déverrouille la ressource suivante après validation du chapitre", async () => {
    const unlocked: LearningJourney = {...journey, progression: 50, modules: journey.modules.map((module, index) => index === 0
      ? {...module, etat: "TERMINE", progression: 100, chapitres: module.chapitres.map((chapter) => ({...chapter, etat: "TERMINE", progression: 100, ressources: chapter.ressources.map((resource) => ({...resource, etat: "TERMINE"}))}))}
      : index === 1 ? {...module, etat: "DISPONIBLE", chapitres: module.chapitres.map((chapter) => ({...chapter, etat: "DISPONIBLE", ressources: chapter.ressources.map((resource) => ({...resource, etat: "DISPONIBLE"}))}))} : module)};
    let journeyCalls = 0;
    installApi((path, options) => {
      if (path === "/participant/formations/7/parcours") return ++journeyCalls === 1 ? journey : unlocked;
      if (path.includes("/progression") && options?.method === "PUT") return {formationId: 7, chapitreId: 10, termine: true, positionVideoSecondes: 0, pourcentage: 50};
    });
    const user = userEvent.setup();
    render(<LearningReaderPage />);
    await screen.findByRole("heading", {name: "Guide PDF"});
    await user.click(screen.getByRole("button", {name: /Suivant.*Vidéo externe/}));
    expect(screen.getByRole("button", {name: /Suivant.*Démonstration uploadée/})).toBeDisabled();
    await user.click(screen.getByRole("button", {name: "Marquer comme terminé"}));
    await waitFor(() => expect(screen.getByRole("button", {name: /Suivant.*Démonstration uploadée/})).toBeEnabled());
  });
});
