import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import OnboardingPage from "@/app/participant/onboarding/page";
import {api, currentUser} from "@/lib/api";
import type {Preferences} from "@/lib/engagement";

const replace = vi.fn();
vi.mock("next/navigation", () => ({useRouter: () => ({replace})}));
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  currentUser: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(message: string, public readonly status: number, public readonly code?: string) {
      super(message);
      this.name = "ApiRequestError";
    }
  },
}));

const apiMock = vi.mocked(api);
const currentUserMock = vi.mocked(currentUser);
const defaults: Preferences = {
  domaines: [], niveau: "DEBUTANT", objectif: "", minutesHebdomadaires: 60,
  formatPrefere: "PRATIQUE", rappelsActifs: false, onboardingTermine: false,
  onboardingIgnore: false, fuseauHoraire: "Africa/Casablanca",
};
const existing: Preferences = {
  domaines: ["Data", "Design"], niveau: "INTERMEDIAIRE", objectif: "Analyser des données",
  minutesHebdomadaires: 120, formatPrefere: "LECTURE", rappelsActifs: true,
  onboardingTermine: true, onboardingIgnore: false, fuseauHoraire: "Africa/Casablanca",
};

describe("onboarding participant", () => {
  beforeEach(() => {
    apiMock.mockReset();
    replace.mockReset();
    currentUserMock.mockReturnValue({
      id: 1, nom: "Nora", email: "nora@test.local", role: "PARTICIPANT",
      statut: "ACTIF", createdAt: "2026-08-01T00:00:00Z",
    });
    localStorage.setItem("user", JSON.stringify(currentUserMock()));
  });

  it("distingue un nouveau participant sans préférences", async () => {
    apiMock.mockResolvedValue(defaults);
    render(<OnboardingPage />);

    expect(await screen.findByText(/Aucune préférence enregistrée/)).toBeInTheDocument();
    expect(screen.getByLabelText("Votre niveau actuel")).toHaveValue("DEBUTANT");
    expect(screen.getByPlaceholderText(/évoluer vers un poste/)).toHaveValue("");
  });

  it("initialise le formulaire avec les préférences existantes", async () => {
    apiMock.mockResolvedValue(existing);
    render(<OnboardingPage />);

    expect(await screen.findByText(/préférences enregistrées ont été chargées/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Data")).toBeChecked();
    expect(screen.getByLabelText("Design")).toBeChecked();
    expect(screen.getByLabelText("Votre niveau actuel")).toHaveValue("INTERMEDIAIRE");
    expect(screen.getByPlaceholderText(/évoluer vers un poste/)).toHaveValue("Analyser des données");
    expect(screen.getByLabelText(/Activer les rappels utiles/)).toBeChecked();
  });

  it("réaffiche uniquement les valeurs confirmées par le serveur après sauvegarde", async () => {
    const confirmed = {...existing, objectif: "Objectif normalisé serveur", minutesHebdomadaires: 180};
    apiMock.mockResolvedValueOnce(existing).mockResolvedValueOnce(confirmed);
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const objective = await screen.findByPlaceholderText(/évoluer vers un poste/);
    await user.clear(objective);
    await user.type(objective, "Brouillon utilisateur");
    await user.click(screen.getByRole("button", {name: "Enregistrer mes préférences"}));

    expect(await screen.findByText(/Objectif normalisé serveur/)).toBeInTheDocument();
    expect(objective).toHaveValue("Objectif normalisé serveur");
    expect(screen.getByLabelText("Temps disponible par semaine")).toHaveValue("180");
    expect(replace).not.toHaveBeenCalled();
  });

  it("permet de réessayer après un échec de chargement", async () => {
    apiMock.mockRejectedValueOnce(new Error("Réseau indisponible")).mockResolvedValueOnce(defaults);
    const user = userEvent.setup();
    render(<OnboardingPage />);

    expect(await screen.findByText("Réseau indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Réessayer"}));
    expect(await screen.findByText(/Aucune préférence enregistrée/)).toBeInTheDocument();
  });

  it("conserve la saisie et ne confirme rien lorsque la sauvegarde échoue", async () => {
    apiMock.mockResolvedValueOnce(existing).mockRejectedValueOnce(new Error("Sauvegarde refusée"));
    const user = userEvent.setup();
    render(<OnboardingPage />);

    const objective = await screen.findByPlaceholderText(/évoluer vers un poste/);
    await user.clear(objective);
    await user.type(objective, "Saisie non écrasée");
    await user.click(screen.getByRole("button", {name: "Enregistrer mes préférences"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sauvegarde refusée");
    expect(objective).toHaveValue("Saisie non écrasée");
    expect(screen.queryByText(/Préférences confirmées par le serveur/)).not.toBeInTheDocument();
  });

  it.each([
    [401, "Votre session a expiré"],
    [403, "réservé aux participants"],
  ])("distingue une réponse HTTP %s", async (status, message) => {
    const {ApiRequestError} = await import("@/lib/api");
    apiMock.mockRejectedValue(new ApiRequestError("Erreur", status));
    render(<OnboardingPage />);
    expect(await screen.findByText(new RegExp(message, "i"))).toBeInTheDocument();
  });

  it("ne réinitialise pas une saisie pendant les re-renders", async () => {
    apiMock.mockResolvedValue(existing);
    const user = userEvent.setup();
    const {rerender} = render(<OnboardingPage />);
    const objective = await screen.findByPlaceholderText(/évoluer vers un poste/);
    await user.clear(objective);
    await user.type(objective, "Brouillon en cours");
    rerender(<OnboardingPage />);
    expect(objective).toHaveValue("Brouillon en cours");
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
  });
});
