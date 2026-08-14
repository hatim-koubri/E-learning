import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import ReviewModerationPage from "@/app/admin/avis/page";
import {api, currentUser} from "@/lib/api";
import type {ModerationCase, ModerationQueue, ModerationReport} from "@/lib/engagement";

const replace = vi.fn();

vi.mock("next/navigation", () => ({useRouter: () => ({replace})}));
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  currentUser: vi.fn(),
  logout: vi.fn(),
  saveSession: vi.fn(),
}));

const apiMock = vi.mocked(api);
const currentUserMock = vi.mocked(currentUser);
const longComment = "Commentaire très long ".repeat(80);
const longReason = "Motif détaillé ".repeat(35);
const longReply = "Réponse pédagogique ".repeat(60);

const report: ModerationReport = {
  signalement: {id: 11, motif: longReason, date: null, statut: "EN_ATTENTE"},
  avis: {
    id: 9,
    note: 4,
    commentaire: longComment,
    statut: "SIGNALE",
    createdAt: null,
    updatedAt: "date-invalide",
    reponseFormateur: longReply,
  },
  contexte: {
    formationId: 7,
    formationTitre: "Architecture Java avancée avec un titre volontairement très long",
    auteurNom: "Participant au nom public particulièrement long",
    formateurNom: "Sara Formatrice",
  },
  decision: null,
};

function queue(content: ModerationReport[]): ModerationQueue {
  const grouped = new Map<number, ModerationCase>();
  for (const item of content) {
    const current = grouped.get(item.avis.id);
    if (current) current.signalements.push(item.signalement);
    else grouped.set(item.avis.id, {avis: item.avis, contexte: item.contexte, signalements: [item.signalement]});
  }
  const cases = [...grouped.values()];
  return {content: cases, page: 0, totalPages: cases.length ? 1 : 0, totalElements: cases.length};
}

describe("workflow de modération Admin", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentUserMock.mockReset();
    replace.mockReset();
    currentUserMock.mockReturnValue({
      id: 1, nom: "Admin", email: "admin@nexa.test", role: "ADMIN", statut: "ACTIF", createdAt: "",
    });
  });

  it("charge le contexte complet, les textes longs et protège toutes les dates nulles", async () => {
    apiMock.mockResolvedValue(queue([report]));

    render(<ReviewModerationPage />);

    expect(await screen.findByText(report.contexte.formationTitre)).toBeInTheDocument();
    const longTexts = Array.from(document.querySelectorAll(".moderation-long-text"), (element) => element.textContent);
    expect(longTexts).toEqual(expect.arrayContaining([
      report.avis.commentaire,
      report.avis.reponseFormateur,
      report.signalement.motif,
    ]));
    expect(screen.getByText(/Avis de/)).toHaveTextContent(report.contexte.auteurNom);
    expect(screen.getByLabelText("Note 4 sur 5")).toBeInTheDocument();
    expect(screen.getByText(/Créé le/)).toHaveTextContent(
      "Créé le Date non disponible · dernière modification Date non disponible",
    );
    expect(screen.getAllByText("Date non disponible").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/01\/01\/1970/)).not.toBeInTheDocument();
  });

  it("regroupe les signalements d’un même avis et garde les textes complets accessibles", async () => {
    const second = {
      ...report,
      signalement: {id: 12, motif: "Second motif détaillé ".repeat(30), date: null, statut: "EN_ATTENTE" as const},
    };
    apiMock.mockResolvedValue(queue([report, second]));

    const user = userEvent.setup();
    render(<ReviewModerationPage />);

    expect(await screen.findByText(/2 signalements/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", {name: "Republier l’avis"})).toHaveLength(1);
    expect(screen.getByText("Signalement #11")).toBeInTheDocument();
    expect(screen.getByText("Signalement #12")).toBeInTheDocument();
    const expand = screen.getAllByRole("button", {name: "Lire le texte complet"})[0];
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await user.click(expand);
    expect(expand).toHaveAttribute("aria-expanded", "true");
  });

  it("sépare une erreur initiale de l’état vide", async () => {
    apiMock.mockRejectedValue(new Error("Backend de modération indisponible"));

    render(<ReviewModerationPage />);

    expect(await screen.findByText("Backend de modération indisponible")).toBeInTheDocument();
    expect(screen.queryByText("Aucun signalement à traiter")).not.toBeInTheDocument();
  });

  it("n’affiche l’état vide qu’après un chargement réussi", async () => {
    apiMock.mockResolvedValue(queue([]));

    render(<ReviewModerationPage />);

    expect(await screen.findByText("Aucun signalement à traiter")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("confirme la republication, bloque le double clic et recharge avant d’annoncer le succès", async () => {
    let resolved = false;
    let release!: () => void;
    const decision = new Promise<void>((resolve) => { release = resolve; });
    apiMock.mockImplementation(async (path) => {
      if (path === "/admin/avis/signalements?page=0&size=20") return queue(resolved ? [] : [report]) as never;
      if (path === "/admin/avis/9/republier") {
        await decision;
        resolved = true;
        return {} as never;
      }
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<ReviewModerationPage />);
    await user.click(await screen.findByRole("button", {name: "Republier l’avis"}));
    expect(apiMock).not.toHaveBeenCalledWith("/admin/avis/9/republier", {method: "PATCH"});
    const dialog = screen.getByRole("dialog", {name: "Republier cet avis ?"});
    const cancel = within(dialog).getByRole("button", {name: "Annuler"});
    await waitFor(() => expect(cancel).toHaveFocus());
    const confirm = within(dialog).getByRole("button", {name: "Confirmer la republication"});
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(apiMock.mock.calls.filter(([path]) => path === "/admin/avis/9/republier")).toHaveLength(1);

    release();
    const success = await screen.findByText(/avis a été republié/i);
    expect(success.closest("[aria-live='polite']")).not.toBeNull();
    expect(await screen.findByText("Aucun signalement à traiter")).toBeInTheDocument();
  });

  it("explique le conflit 409, recharge et conserve la vérité renvoyée par le serveur", async () => {
    let listCalls = 0;
    apiMock.mockImplementation(async (path) => {
      if (path === "/admin/avis/signalements?page=0&size=20") {
        listCalls += 1;
        return queue([report]) as never;
      }
      if (path === "/admin/avis/9/masquer") throw Object.assign(new Error("Conflit"), {status: 409});
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<ReviewModerationPage />);
    await user.click(await screen.findByRole("button", {name: "Confirmer le masquage"}));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Confirmer le masquage"}));

    expect(await screen.findByText(/traité par un autre administrateur/i)).toBeInTheDocument();
    expect(screen.getByText(report.contexte.formationTitre)).toBeInTheDocument();
    expect(listCalls).toBe(2);
  });

  it("ne retire rien et garde la confirmation ouverte quand le serveur refuse l’action", async () => {
    let listCalls = 0;
    apiMock.mockImplementation(async (path) => {
      if (path === "/admin/avis/signalements?page=0&size=20") {
        listCalls += 1;
        return queue([report]) as never;
      }
      if (path === "/admin/avis/9/republier") throw new Error("Décision indisponible");
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<ReviewModerationPage />);
    await user.click(await screen.findByRole("button", {name: "Republier l’avis"}));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Confirmer la republication"}));

    expect(await screen.findByText("Décision indisponible")).toBeInTheDocument();
    expect(screen.getByText(report.contexte.formationTitre)).toBeInTheDocument();
    expect(screen.getByRole("dialog", {name: "Republier cet avis ?"})).toBeInTheDocument();
    expect(listCalls).toBe(1);
  });

  it("gère Échap et restaure le focus sur l’action d’origine", async () => {
    apiMock.mockResolvedValue(queue([report]));
    const user = userEvent.setup();
    render(<ReviewModerationPage />);
    const mask = await screen.findByRole("button", {name: "Confirmer le masquage"});
    await user.click(mask);
    const cancel = within(screen.getByRole("dialog")).getByRole("button", {name: "Annuler"});
    await waitFor(() => expect(cancel).toHaveFocus());

    fireEvent.keyDown(window, {key: "Escape"});

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mask).toHaveFocus());
  });

  it.each([
    [401, "Votre session administrateur a expiré"],
    [403, "Votre compte n’est pas autorisé"],
  ])("présente clairement l’erreur HTTP %s", async (status, message) => {
    apiMock.mockRejectedValue(Object.assign(new Error("Erreur brute"), {status}));

    render(<ReviewModerationPage />);

    expect(await screen.findByText(new RegExp(message))).toBeInTheDocument();
    expect(screen.queryByText("Aucun signalement à traiter")).not.toBeInTheDocument();
  });

  it("parcourt les dossiers complets avec les contrôles Précédent et Suivant", async () => {
    const nextCase={...queue([report]).content[0],avis:{...report.avis,id:10},contexte:{...report.contexte,formationTitre:"Dossier suivant"}};
    apiMock.mockImplementation(async (path) => {
      if(path==="/admin/avis/signalements?page=0&size=20")return {content:queue([report]).content,page:0,totalPages:2,totalElements:2} as never;
      if(path==="/admin/avis/signalements?page=1&size=20")return {content:[nextCase],page:1,totalPages:2,totalElements:2} as never;
      throw new Error(`Appel inattendu: ${path}`);
    });
    const user=userEvent.setup();render(<ReviewModerationPage/>);
    expect(await screen.findByText((_,element)=>element?.textContent==="Page 1 sur 2")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Précédent"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Suivant"}));
    expect(await screen.findByText("Dossier suivant")).toBeInTheDocument();
    expect(screen.getByText((_,element)=>element?.textContent==="Page 2 sur 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Précédent"}));
    expect(await screen.findByText(report.contexte.formationTitre)).toBeInTheDocument();
  });
});
