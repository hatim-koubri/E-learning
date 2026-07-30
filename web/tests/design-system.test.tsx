import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import Home from "@/app/page";
import GlobalError from "@/app/error";
import Loading from "@/app/loading";
import NotFound from "@/app/not-found";
import {ThemeToggle} from "@/components/ThemeToggle";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Pagination,
  ProgressBar,
  Tabs,
} from "@/components/ui";
import {api} from "@/lib/api";

vi.mock("@/lib/api", () => ({api: vi.fn()}));
vi.mock("next/image", () => ({default: () => <span data-testid="next-image" />}));
const apiMock = vi.mocked(api);

describe("design system et accueil", () => {
  beforeEach(() => {
    apiMock.mockReset();
    document.documentElement.dataset.theme = "light";
  });

  it("alimente la landing avec les formations réellement publiées", async () => {
    apiMock.mockResolvedValue({
      content: [{
        id: 7,
        titre: "Architecture React",
        description: "Construire une application robuste",
        langue: "fr",
        niveau: "INTERMEDIAIRE",
        categorie: "Web",
        prix: 120,
        formateur: "Sara",
        nombreModules: 4,
        nombreChapitres: 12,
      }],
      page: 0,
      size: 3,
      totalElements: 1,
      totalPages: 1,
    });
    render(<Home />);
    expect(screen.getByRole("heading", {name: /Développez vos compétences/})).toBeInTheDocument();
    expect(await screen.findByText("Architecture React")).toBeInTheDocument();
    expect(screen.getAllByRole("link", {name: /Explorer les formations/}).length).toBeGreaterThan(0);
    expect(apiMock).toHaveBeenCalledWith("/catalogue?page=0&size=3");
  });

  it("affiche l'échec réel de la sélection sans inventer de cours", async () => {
    apiMock.mockRejectedValue(new Error("Catalogue indisponible"));
    render(<Home />);
    expect(await screen.findByText("Catalogue indisponible")).toBeInTheDocument();
  });

  it("gère le thème, les onglets, la pagination et la confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    const change = vi.fn();
    const previous = vi.fn();
    const next = vi.fn();
    const {rerender} = render(
      <>
        <ThemeToggle />
        <Tabs items={[{id: "a", label: "Aperçu"}, {id: "b", label: "Programme"}]} active="a" onChange={change} />
        <Pagination page={1} totalPages={3} onPrevious={previous} onNext={next} />
        <ProgressBar value={125} />
        <ConfirmDialog
          open
          title="Confirmer l’action"
          description="Cette action demande une validation."
          onCancel={() => undefined}
          onConfirm={confirm}
        />
      </>,
    );
    await user.click(screen.getByLabelText("Activer le thème sombre"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    await user.click(screen.getByRole("tab", {name: "Programme"}));
    expect(change).toHaveBeenCalledWith("b");
    await user.click(screen.getByRole("button", {name: "Précédent"}));
    await user.click(screen.getByRole("button", {name: "Suivant"}));
    expect(previous).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    await user.click(screen.getByRole("button", {name: "Confirmer"}));
    expect(confirm).toHaveBeenCalled();
    rerender(<ConfirmDialog open={false} title="" description="" onCancel={() => undefined} onConfirm={confirm} />);
    expect(screen.queryByText("Confirmer l’action")).not.toBeInTheDocument();
  });

  it("rend les états globaux accessibles", async () => {
    const reset = vi.fn();
    const {rerender} = render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    rerender(<GlobalError error={new Error("Incident contrôlé")} reset={reset} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Incident contrôlé");
    await userEvent.click(screen.getByRole("button", {name: "Réessayer"}));
    expect(reset).toHaveBeenCalled();
    rerender(<NotFound />);
    expect(screen.getByText("Cette page n’existe pas")).toBeInTheDocument();
    rerender(
      <>
        <Alert variant="warning">Attention</Alert>
        <EmptyState title="Vide" description="Aucun élément" />
        <ErrorState message="Erreur" />
      </>,
    );
    await waitFor(() => expect(screen.getByText("Attention")).toBeInTheDocument());
  });
});
