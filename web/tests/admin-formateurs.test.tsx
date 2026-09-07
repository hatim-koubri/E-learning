import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import AdminFormateursPage from "@/app/admin/formateurs/page";
import {api, currentUser} from "@/lib/api";

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
const pending = {id: 7, nom: "Sara", email: "sara.candidature.avec.une.adresse.email.volontairement.tres.longue@nexa.test", statut: "EN_ATTENTE", createdAt: "date-invalide"};
const listPath = "/admin/formateurs/demandes?page=0&size=20";
const trainerPage = (content: typeof pending[], page=0, totalPages=content.length ? 1 : 0, totalElements=content.length) =>
  ({content, page, totalPages, totalElements});

describe("workflow administrateur des demandes formateurs", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentUserMock.mockReset();
    replace.mockReset();
    currentUserMock.mockReturnValue({
      id: 1,
      nom: "Admin",
      email: "admin@nexa.test",
      role: "ADMIN",
      statut: "ACTIF",
      createdAt: "",
    });
  });

  it("présente une carte lisible, protège les dates et confirme l’acceptation une seule fois", async () => {
    let resolveDecision!: () => void;
    let accepted = false;
    const decision = new Promise<void>((resolve) => { resolveDecision = resolve; });
    apiMock.mockImplementation(async (path) => {
      if (path === listPath) return trainerPage(accepted ? [] : [pending]) as never;
      if (path === "/admin/formateurs/7/accepter") {
        await decision;
        accepted = true;
        return {} as never;
      }
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<AdminFormateursPage />);

    await screen.findByRole("heading", {name: "Candidatures à traiter"});
    const request = screen.getByRole("listitem");
    expect(within(request).getByText("Non renseignée")).toBeInTheDocument();
    expect(within(request).getByText(pending.email)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("Manuelle")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {name: "Accepter"}));
    expect(apiMock).not.toHaveBeenCalledWith("/admin/formateurs/7/accepter", {method: "PATCH"});
    const cancel = screen.getByRole("button", {name: "Annuler"});
    await waitFor(() => expect(cancel).toHaveFocus());

    const confirm = screen.getByRole("button", {name: "Confirmer l’acceptation"});
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(apiMock.mock.calls.filter(([path]) => path === "/admin/formateurs/7/accepter")).toHaveLength(1);

    resolveDecision();
    expect(await screen.findByText(/demande a été acceptée/i)).toBeInTheDocument();
  });

  it("focalise et borne le motif, puis restaure le focus après Échap", async () => {
    apiMock.mockImplementation(async (path, options) => {
      if (path === listPath) return trainerPage([pending]) as never;
      if (path === "/admin/formateurs/7/refuser" && options?.method === "PATCH") return {} as never;
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<AdminFormateursPage />);
    const refusalButton = await screen.findByRole("button", {name: "Refuser"});
    await user.click(refusalButton);
    const textarea = screen.getByRole("textbox", {name: "Motif du refus"});
    await waitFor(() => expect(textarea).toHaveFocus());
    expect(textarea).toHaveAttribute("maxlength", "500");
    await user.type(textarea, "  Profil incomplet  ");
    expect(screen.getByText("20/500 caractères")).toBeInTheDocument();

    fireEvent.keyDown(window, {key: "Escape"});
    expect(screen.queryByRole("dialog", {name: "Refuser cette demande ?"})).not.toBeInTheDocument();
    await waitFor(() => expect(refusalButton).toHaveFocus());

    await user.click(refusalButton);
    await user.type(screen.getByRole("textbox", {name: "Motif du refus"}), "Profil incomplet");
    await user.click(screen.getByRole("button", {name: "Confirmer le refus"}));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/admin/formateurs/7/refuser", {
      method: "PATCH",
      body: JSON.stringify({motif: "Profil incomplet"}),
    }));
  });

  it("garde la demande visible quand le serveur refuse l’action", async () => {
    apiMock.mockImplementation(async (path) => {
      if (path === listPath) return trainerPage([pending]) as never;
      if (path === "/admin/formateurs/7/accepter") throw new Error("Décision indisponible");
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<AdminFormateursPage />);
    await user.click(await screen.findByRole("button", {name: "Accepter"}));
    await user.click(screen.getByRole("button", {name: "Confirmer l’acceptation"}));

    expect(await screen.findByText("Décision indisponible")).toBeInTheDocument();
    expect(screen.getByText("Sara")).toBeInTheDocument();
    expect(screen.getByRole("dialog", {name: "Accepter cette demande ?"})).toBeInTheDocument();
  });

  it("explique un conflit concurrent et recharge la liste", async () => {
    let listCalls = 0;
    apiMock.mockImplementation(async (path) => {
      if (path === listPath) {
        listCalls += 1;
        return trainerPage(listCalls === 1 ? [pending] : []) as never;
      }
      if (path === "/admin/formateurs/7/accepter") {
        throw Object.assign(new Error("Conflit"), {status: 409});
      }
      throw new Error(`Appel inattendu: ${path}`);
    });

    const user = userEvent.setup();
    render(<AdminFormateursPage />);
    await user.click(await screen.findByRole("button", {name: "Accepter"}));
    await user.click(screen.getByRole("button", {name: "Confirmer l’acceptation"}));

    expect(await screen.findByText(/traitée par un autre administrateur/i)).toBeInTheDocument();
    expect(await screen.findByText("Aucune demande en attente")).toBeInTheDocument();
    expect(listCalls).toBe(2);
  });

  it("affiche une erreur initiale sans faux état vide et permet de réessayer", async () => {
    apiMock.mockRejectedValueOnce(new Error("Service des demandes indisponible"));
    apiMock.mockResolvedValueOnce(trainerPage([]) as never);
    const user = userEvent.setup();

    render(<AdminFormateursPage />);

    expect(await screen.findByText("Service des demandes indisponible")).toBeInTheDocument();
    expect(screen.queryByText("Aucune demande en attente")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Réessayer"}));
    expect(await screen.findByText("Aucune demande en attente")).toBeInTheDocument();
  });

  it.each([[401, /session administrateur a expiré/i], [403, /pas autorisé/i]])("distingue HTTP %s", async (status, expected) => {
    apiMock.mockRejectedValue(Object.assign(new Error("Erreur"), {status}));
    render(<AdminFormateursPage />);
    expect(await screen.findByText(expected)).toBeInTheDocument();
    expect(screen.queryByText("Aucune demande en attente")).not.toBeInTheDocument();
  });

  it("affiche le total global et parcourt les demandes au clavier", async () => {
    const second={...pending,id:8,nom:"Deuxième page"};
    apiMock.mockImplementation(async (path) => {
      if(path===listPath)return trainerPage([pending],0,2,21) as never;
      if(path==="/admin/formateurs/demandes?page=1&size=20")return trainerPage([second],1,2,21) as never;
      throw new Error(`Appel inattendu: ${path}`);
    });
    const user=userEvent.setup(); render(<AdminFormateursPage/>);
    expect(await screen.findByText("21 demande(s) nécessitent une décision.")).toBeInTheDocument();
    const next=screen.getByRole("button",{name:"Suivant"});
    next.focus(); await user.keyboard("{Enter}");
    expect(await screen.findByText("Deuxième page")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Suivant"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Précédent"}));
    expect(await screen.findByText("Sara")).toBeInTheDocument();
  });
});
