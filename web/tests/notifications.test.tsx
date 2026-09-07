import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import NotificationsPage from "@/app/notifications/page";
import {api, currentUser} from "@/lib/api";

vi.mock("next/navigation", () => ({useRouter: () => ({replace: vi.fn()})}));
vi.mock("@/lib/api", () => ({
  api: vi.fn(), currentUser: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    constructor(message: string, public readonly status: number) { super(message); }
  },
}));
const apiMock = vi.mocked(api);
const userMock = vi.mocked(currentUser);
const notification = {id: 1, categorie: "CLASSE", titre: "Séance demain", message: "Rappel",
  actionUrl: "/participant/classes", lue: false, createdAt: "2026-08-10T10:00:00Z"};
const classPreference = {categorie: "CLASSE", dansApplication: true, emailActif: false,
  configurableDansApplication: true, configurableEmail: true};
const mandatoryPreference = {categorie: "COMPTE_FORMATEUR", dansApplication: true, emailActif: true,
  configurableDansApplication: false, configurableEmail: false};

describe("centre de notifications", () => {
  beforeEach(() => {
    apiMock.mockReset();
    userMock.mockReturnValue({id: 1, nom: "Nora", email: "nora@test.local", role: "PARTICIPANT", statut: "ACTIF", createdAt: ""});
  });

  it("charge notifications et préférences et expose honnêtement les communications obligatoires", async () => {
    apiMock.mockImplementation(async (path) => path === "/notifications?page=0&size=20"
      ? {content: [], nonLues: 0, page: 0, totalPages: 0}
      : [classPreference, mandatoryPreference]);
    render(<NotificationsPage />);
    expect(await screen.findByText("Aucune notification")).toBeInTheDocument();
    expect(screen.getByRole("group", {name: "Classes et séances"})).toBeInTheDocument();
    const mandatory = screen.getByRole("group", {name: /Décisions relatives/});
    expect(mandatory).toHaveTextContent("Communication obligatoire");
    expect(mandatory.querySelectorAll("input:disabled")).toHaveLength(2);
  });

  it("n’appelle ni n’affiche les préférences pour un Admin", async () => {
    userMock.mockReturnValue({id: 2, nom: "Admin", email: "admin@test.local", role: "ADMIN", statut: "ACTIF", createdAt: ""});
    apiMock.mockImplementation(async (path) => {
      if (path === "/notifications?page=0&size=20") return {content: [], nonLues: 0, page: 0, totalPages: 0} as never;
      throw new Error(`Appel inattendu: ${path}`);
    });

    render(<NotificationsPage />);

    expect(await screen.findByRole("heading", {name: "Communications administratives"})).toBeInTheDocument();
    expect(screen.queryByRole("heading", {name: "Préférences"})).not.toBeInTheDocument();
    expect(apiMock.mock.calls.some(([path]) => path === "/notifications/preferences")).toBe(false);
  });

  it("conserve les préférences configurables pour un Formateur", async () => {
    userMock.mockReturnValue({id: 3, nom: "Formateur", email: "formateur@test.local", role: "FORMATEUR", statut: "ACTIF", createdAt: ""});
    apiMock.mockImplementation(async (path) => path === "/notifications?page=0&size=20"
      ? {content: [], nonLues: 0, page: 0, totalPages: 0}
      : [classPreference]);

    render(<NotificationsPage />);

    expect(await screen.findByRole("group", {name: "Classes et séances"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Email"})).toBeEnabled();
  });

  it("applique uniquement la réponse serveur et bloque un double clic", async () => {
    let resolveSave!: (value: unknown) => void;
    const save = new Promise((resolve) => { resolveSave = resolve; });
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/notifications?page=0&size=20") return {content: [], nonLues: 0, page: 0, totalPages: 0};
      if (path === "/notifications/preferences" && options?.method === "PUT") return save;
      return [classPreference];
    });
    const user = userEvent.setup(); render(<NotificationsPage />);
    const email = await screen.findByRole("checkbox", {name: "Email"});
    await user.dblClick(email);
    expect(apiMock.mock.calls.filter(([path, options]) => path === "/notifications/preferences" && options?.method === "PUT")).toHaveLength(1);
    resolveSave({...classPreference, emailActif: true});
    expect(await screen.findByText(/confirmées par le serveur/)).toBeInTheDocument();
    expect(email).toBeChecked();
  });

  it("restaure une préférence lorsque la sauvegarde échoue", async () => {
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/notifications?page=0&size=20") return {content: [], nonLues: 0, page: 0, totalPages: 0};
      if (path === "/notifications/preferences" && options?.method === "PUT") throw new Error("SMTP indisponible");
      return [classPreference];
    });
    const user = userEvent.setup(); render(<NotificationsPage />);
    const email = await screen.findByRole("checkbox", {name: "Email"});
    await user.click(email);
    expect(await screen.findByText("SMTP indisponible")).toBeInTheDocument();
    expect(email).not.toBeChecked();
  });

  it("maintient le compteur lors de la lecture individuelle puis globale", async () => {
    apiMock.mockImplementation(async (path) => path === "/notifications?page=0&size=20"
      ? {content: [notification, {...notification, id: 2}], nonLues: 2, page: 0, totalPages: 1}
      : [classPreference]);
    const user = userEvent.setup(); render(<NotificationsPage />);
    await user.click((await screen.findAllByRole("button", {name: "Marquer comme lue"}))[0]);
    expect(screen.getByText("1 non lue(s)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /Tout marquer comme lu/}));
    expect(screen.getByText("0 non lue(s)")).toBeInTheDocument();
  });

  it.each([[401, /session a expiré/i], [403, /autorisation/i]])("distingue HTTP %s", async (status, expected) => {
    const {ApiRequestError} = await import("@/lib/api");
    apiMock.mockRejectedValue(new ApiRequestError("Erreur", status));
    render(<NotificationsPage />);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("parcourt la page suivante, la dernière page et revient à la précédente", async () => {
    apiMock.mockImplementation(async (path) => {
      if (path === "/notifications?page=0&size=20") return {content: [notification], nonLues: 7, page: 0, totalPages: 3};
      if (path === "/notifications?page=1&size=20") return {content: [{...notification, id: 2, titre: "Page deux"}], nonLues: 7, page: 1, totalPages: 3};
      if (path === "/notifications?page=2&size=20") return {content: [{...notification, id: 3, titre: "Dernière page"}], nonLues: 7, page: 2, totalPages: 3};
      if (path === "/notifications/preferences") return [classPreference];
      throw new Error(`Appel inattendu: ${path}`);
    });
    const user = userEvent.setup(); render(<NotificationsPage />);
    await user.click(await screen.findByRole("button", {name: "Suivant"}));
    expect(await screen.findByText("Page deux")).toBeInTheDocument();
    expect(screen.getByText("7 non lue(s)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Suivant"}));
    expect(await screen.findByText("Dernière page")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Suivant"})).toBeDisabled();
    await user.click(screen.getByRole("button", {name: "Précédent"}));
    expect(await screen.findByText("Page deux")).toBeInTheDocument();
  });

  it("revient à la dernière page existante lorsqu’une page devient vide", async () => {
    apiMock.mockImplementation(async (path) => {
      if (path === "/notifications?page=0&size=20") return {content: [notification], nonLues: 1, page: 0, totalPages: 2};
      if (path === "/notifications?page=1&size=20") return {content: [], nonLues: 1, page: 1, totalPages: 1};
      if (path === "/notifications/preferences") return [classPreference];
      throw new Error(`Appel inattendu: ${path}`);
    });
    const user = userEvent.setup(); render(<NotificationsPage />);
    await user.click(await screen.findByRole("button", {name: "Suivant"}));
    expect(await screen.findByText(notification.titre)).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledWith("/notifications?page=1&size=20");
  });
});
