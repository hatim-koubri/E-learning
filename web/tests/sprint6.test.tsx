import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import NotesPage from "@/app/participant/notes/page";
import Home from "@/app/page";
import {KnowledgePath} from "@/components/KnowledgePath";
import {AppShell} from "@/components/AppShell";
import {MotionObserver} from "@/components/MotionObserver";
import {PublicHeader} from "@/components/PublicHeader";
import {SessionTiming} from "@/components/SessionTiming";
import {ThemeToggle} from "@/components/ThemeToggle";
import {Modal, Tabs} from "@/components/ui";
import {api, currentUser} from "@/lib/api";
import type {Session} from "@/lib/classes";

vi.mock("@/lib/api", () => ({api: vi.fn(), currentUser: vi.fn(() => null)}));
vi.mock("next/image", () => ({default: () => <span data-testid="next-image" />}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({push: vi.fn(), replace: vi.fn()}),
}));

const apiMock = vi.mocked(api);
const currentUserMock = vi.mocked(currentUser);
const emptyCatalogue = {
  content: [],
  page: 0,
  size: 3,
  totalElements: 0,
  totalPages: 0,
};

describe("Sprint 6 — placement, mouvement et clavier", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockResolvedValue(emptyCatalogue);
    currentUserMock.mockReturnValue(null);
    localStorage.clear();
    document.documentElement.dataset.theme = "light";
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("intègre le statut et la progression dans la carte illustrative du hero", async () => {
    render(<Home />);
    const preview = screen.getByLabelText("Aperçu illustratif de l’espace d’apprentissage");

    expect(preview).toHaveTextContent("Mon apprentissage");
    expect(preview).toHaveTextContent("Classe en direct");
    expect(preview).toHaveTextContent("68 %");
    expect(preview).toHaveTextContent("Donnée de démonstration");
    expect(screen.getByRole("progressbar", {name: "Progression illustrative du parcours"}))
      .toHaveAttribute("aria-valuenow", "68");
    expect(preview).toHaveTextContent("Reprendre le dernier chapitre");
    expect(preview).toHaveTextContent("Préparer le prochain QCM");
    expect(preview).toHaveTextContent("Rejoindre votre classe");
    expect(await screen.findByText("Le catalogue se prépare")).toBeInTheDocument();
  });

  it("navigue entre les étapes du parcours avec les flèches, Home et End", async () => {
    const user = userEvent.setup();
    render(<KnowledgePath active={2} />);
    const practice = screen.getByRole("button", {
      name: "Pratiquer, étape active. Valider par l’action",
    });
    const participate = screen.getByRole("button", {
      name: "Participer, à venir. Échanger en direct",
    });
    const discover = screen.getByRole("button", {
      name: "Découvrir, terminée. Identifier le parcours utile",
    });

    practice.focus();
    await user.keyboard("{ArrowRight}");
    expect(participate).toHaveFocus();
    await user.keyboard("{Home}");
    expect(discover).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("button", {
      name: "Maîtriser, à venir. Consolider les acquis",
    })).toHaveFocus();
  });

  it("synchronise le contrôle avec un thème sombre déjà actif", async () => {
    localStorage.setItem("theme", "dark");
    document.documentElement.dataset.theme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggle = await screen.findByRole("button", {name: "Activer le thème clair"});
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByRole("button", {name: "Activer le thème sombre"})).toBeInTheDocument();
  });

  it("rend le header compact au scroll et referme son menu avec Échap", async () => {
    const user = userEvent.setup();
    const {container} = render(<PublicHeader />);
    Object.defineProperty(window, "scrollY", {configurable: true, value: 80});
    window.dispatchEvent(new Event("scroll"));
    await waitFor(() => expect(container.querySelector(".public-header")).toHaveClass("compact"));

    await user.click(screen.getByRole("button", {name: "Ouvrir le menu"}));
    expect(screen.getByRole("navigation", {name: "Navigation principale"})).toHaveClass("open");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("navigation", {name: "Navigation principale"})).not.toHaveClass("open");
  });

  it("retire le menu applicatif mobile fermé de la navigation clavier", async () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()})),
    });
    const user = userEvent.setup();
    const {container, unmount} = render(<AppShell role="PARTICIPANT"><p>Contenu principal</p></AppShell>);
    const sidebar = await waitFor(() => {
      const element = container.querySelector("#workspace-navigation");
      expect(element).toHaveAttribute("inert");
      return element as HTMLElement;
    });
    expect(sidebar).toHaveAttribute("aria-hidden", "true");

    const opener = screen.getByRole("button", {name: "Ouvrir le menu"});
    await user.click(opener);
    expect(sidebar).not.toHaveAttribute("inert");
    expect(sidebar).toHaveAttribute("role", "dialog");
    expect(container.querySelector(".shell-main")).toHaveAttribute("inert");
    await user.keyboard("{Escape}");
    expect(sidebar).toHaveAttribute("inert");
    expect(opener).toHaveFocus();
    unmount();
    Object.defineProperty(window, "matchMedia", {configurable: true, value: originalMatchMedia});
  });

  it("affiche un direct uniquement à partir des dates réelles et nettoie son minuteur", async () => {
    const now = Date.now();
    const live: Session = {
      id: 1,
      titre: "Classe réelle",
      dateDebut: new Date(now - 60_000).toISOString(),
      dateFin: new Date(now + 60_000).toISOString(),
      fuseauHoraire: "Africa/Casablanca",
      statut: "PLANIFIEE",
    };
    const clear = vi.spyOn(window, "clearInterval");
    const {unmount} = render(<SessionTiming session={live} />);

    expect(await screen.findByText("En direct")).toBeInTheDocument();
    expect(screen.getByText("Accessible maintenant")).toBeInTheDocument();
    unmount();
    expect(clear).toHaveBeenCalled();
  });

  it("restaure une note optimiste lorsque le serveur refuse la mise à jour", async () => {
    const user = userEvent.setup();
    currentUserMock.mockReturnValue({
      id: 1,
      nom: "Nora",
      email: "nora@test.local",
      role: "PARTICIPANT",
      statut: "ACTIF",
      createdAt: "2026-07-31T00:00:00Z",
    });
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/participant/notes" && !options) {
        return [{
          id: 11,
          formationId: 7,
          formationTitre: "Architecture React",
          contenu: "Version serveur",
          updatedAt: "2026-07-31T09:00:00Z",
        }] as never;
      }
      if (path === "/participant/notes/11" && options?.method === "PUT") {
        throw new Error("Modification refusée");
      }
      return emptyCatalogue as never;
    });

    render(<NotesPage />);
    await user.click(await screen.findByRole("button", {name: "Modifier"}));
    const field = screen.getByLabelText("Contenu de la note");
    await user.clear(field);
    await user.type(field, "Version optimiste");
    await user.click(screen.getByRole("button", {name: "Enregistrer"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Modification refusée");
    expect(screen.getByLabelText("Contenu de la note")).toHaveValue("Version optimiste");
  });

  it("laisse les sections visibles sans IntersectionObserver", () => {
    const original = window.IntersectionObserver;
    Object.defineProperty(window, "IntersectionObserver", {configurable: true, value: undefined});
    const section = document.createElement("section");
    section.dataset.reveal = "";
    document.body.append(section);
    const {unmount} = render(<MotionObserver />);

    expect(section).not.toHaveClass("is-revealed");
    expect(document.documentElement).not.toHaveClass("motion-enhanced");
    unmount();
    section.remove();
    Object.defineProperty(window, "IntersectionObserver", {configurable: true, value: original});
  });

  it("gère les onglets et la fermeture d’une modale au clavier", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const close = vi.fn();
    const {rerender} = render(
      <Tabs
        items={[{id: "a", label: "Découvrir"}, {id: "b", label: "Apprendre"}]}
        active="a"
        onChange={change}
      />,
    );

    screen.getByRole("tab", {name: "Découvrir"}).focus();
    await user.keyboard("{ArrowRight}");
    expect(change).toHaveBeenCalledWith("b");
    rerender(<Modal open title="Détail accessible" onClose={close}><button>Action</button></Modal>);
    await waitFor(() => expect(screen.getByRole("button", {name: "Fermer"})).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", {name: "Action"})).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", {name: "Fermer"})).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(close).toHaveBeenCalled();
    rerender(<Modal open={false} title="" onClose={close}><button>Action</button></Modal>);
    expect(document.body.style.overflow).toBe("");
  });

  it("centralise les mouvements et neutralise les placements fragiles", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("--duration-fast: 140ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".course-card:focus-within");
    expect(css).toContain(".knowledge-stage:focus-visible");
    expect(css).not.toContain(".hero-score");
    expect(css).not.toMatch(/\.live-chip\s*\{[^}]*position:\s*absolute/);
    expect(css).not.toMatch(/\.map-module:nth-child\(even\)\s*\{[^}]*translateY/);
  });
});
