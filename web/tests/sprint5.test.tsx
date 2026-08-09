import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import ReviewModerationPage from "@/app/admin/avis/page";
import LearningJourneyPage from "@/app/apprentissage/[formationId]/page";
import InstructorPage from "@/app/formateurs/[id]/page";
import TrainerEngagementPage from "@/app/formateur/engagement/page";
import NotificationsPage from "@/app/notifications/page";
import OrientationPage from "@/app/orientation/page";
import NotesPage from "@/app/participant/notes/page";
import OnboardingPage from "@/app/participant/onboarding/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {FavoriteButton} from "@/components/FavoriteButton";
import {api, ApiRequestError, currentUser} from "@/lib/api";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({id: "7", formationId: "7"}),
  useRouter: () => ({replace, push: vi.fn()}),
}));
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
const currentMock = vi.mocked(currentUser);
const participant = {
  id: 1, nom: "Nora", email: "nora@test.local", role: "PARTICIPANT" as const,
  statut: "ACTIF" as const, createdAt: "2026-07-30T00:00:00Z",
};
const trainer = {...participant, id: 2, nom: "Sara", role: "FORMATEUR" as const};

describe("Sprint 5 — engagement, personnalisation et acquisition", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentMock.mockReset();
    currentMock.mockReturnValue(participant);
    replace.mockReset();
    localStorage.setItem("user", JSON.stringify(participant));
  });

  it("termine l’orientation publique et explique une recommandation réelle", async () => {
    currentMock.mockReturnValue(null);
    apiMock.mockResolvedValue([{
      formationId: 7,
      titre: "Data accessible",
      categorie: "Data",
      niveau: "DEBUTANT",
      prix: 0,
      score: 65,
      raisons: ["Dans votre domaine préféré", "Correspond à votre niveau"],
    }]);
    const user = userEvent.setup();
    render(<OrientationPage />);

    const objective = screen.getByPlaceholderText(/préparer une reconversion/i);
    await user.type(objective, "Découvrir les métiers de la donnée");
    await user.click(screen.getByRole("button", {name: /Continuer/}));
    await user.click(screen.getByRole("button", {name: "intermediaire"}));
    await user.click(screen.getByRole("button", {name: /Continuer/}));
    await user.click(screen.getByRole("button", {name: "Data"}));
    await user.click(screen.getByRole("button", {name: /Continuer/}));
    await user.click(screen.getByRole("button", {name: "2 heures"}));
    await user.click(screen.getByRole("button", {name: /Continuer/}));
    await user.click(screen.getByRole("button", {name: "Lecture"}));
    await user.click(screen.getByRole("button", {name: /Voir mes recommandations/}));

    expect(await screen.findByText("Data accessible")).toBeInTheDocument();
    expect(screen.getByText("Dans votre domaine préféré")).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledWith("/orientation/recommandations", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"domaine\":\"Data\""),
    }));
    await user.click(screen.getByRole("button", {name: "Modifier mes réponses"}));
    expect(screen.getByText("Question 5 sur 5")).toBeInTheDocument();
  });

  it("enregistre ou ignore l’onboarding sans forcer les rappels", async () => {
    apiMock.mockResolvedValue({});
    const user = userEvent.setup();
    render(<OnboardingPage />);

    await user.click(await screen.findByLabelText("Développement"));
    await user.selectOptions(screen.getByLabelText("Votre niveau actuel"), "INTERMEDIAIRE");
    await user.type(screen.getByPlaceholderText(/évoluer vers un poste/i), "Concevoir des applications");
    await user.selectOptions(screen.getByLabelText("Temps disponible par semaine"), "120");
    await user.selectOptions(screen.getByLabelText("Format préféré"), "LECTURE");
    await user.click(screen.getByRole("button", {name: /Personnaliser mon espace/}));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/participant/preferences", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("\"rappelsActifs\":false"),
    })));
    expect(replace).toHaveBeenCalledWith("/profile");

    await user.click(screen.getByRole("button", {name: "Ignorer pour le moment"}));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith(
      "/participant/preferences/ignorer-onboarding", {method: "POST"},
    ));
  });

  it("modifie et supprime uniquement les notes privées chargées", async () => {
    const note = {
      id: 11, formationId: 7, formationTitre: "Java moderne",
      chapitreId: 3, chapitreTitre: "Fondations", contenu: "Résumé initial",
      signet: true, createdAt: "2026-07-30T10:00:00Z", updatedAt: "2026-07-30T10:00:00Z",
    };
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/participant/notes") return [note];
      if (options?.method === "PUT") return {...note, contenu: "Résumé enrichi"};
      return {};
    });
    const user = userEvent.setup();
    render(<NotesPage />);

    expect(await screen.findByText("Résumé initial")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Modifier"}));
    await user.clear(screen.getByLabelText("Contenu de la note"));
    await user.type(screen.getByLabelText("Contenu de la note"), "Résumé enrichi");
    await user.click(screen.getByRole("button", {name: "Enregistrer"}));
    expect(await screen.findByText("Note mise à jour.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Supprimer"}));
    await waitFor(() => expect(screen.getByText("Aucune note privée")).toBeInTheDocument());
    expect(apiMock).toHaveBeenCalledWith("/participant/notes/11", {method: "DELETE"});
  });

  it("lit les notifications, tout marque comme lu et respecte les préférences", async () => {
    const notification = {
      id: 4, categorie: "CLASSE" as const, titre: "Classe demain",
      message: "Votre classe commence à 10 h.", actionUrl: "/participant/classes",
      lue: false, createdAt: "2026-07-30T10:00:00Z",
    };
    apiMock.mockImplementation(async (path) => {
      if (path === "/notifications") {
        return {content: [notification, {...notification, id: 5, titre: "Quiz publié"}], nonLues: 2, page: 0, totalPages: 1};
      }
      if (path === "/notifications/preferences") {
        return [{categorie: "CLASSE", dansApplication: true, emailActif: false}];
      }
      return {};
    });
    const user = userEvent.setup();
    render(<NotificationsPage />);

    expect(await screen.findByText("Classe demain")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", {name: "Marquer comme lue"})[0]);
    expect(await screen.findByText("1 non lue(s)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /Tout marquer comme lu/}));
    expect(await screen.findByText("0 non lue(s)")).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Email facultatif/));
    expect(apiMock).toHaveBeenCalledWith("/notifications/preferences", expect.objectContaining({method: "PUT"}));
  });

  it("affiche le lecteur et l’état utile d’un parcours sans ressource", async () => {
    const journey = {
      formationId: 7, titre: "Java moderne", progression: 50,
      modules: [
        {id: 1, titre: "Fondations", etat: "TERMINE", progression: 100,
          chapitres: [{id: 3, titre: "Syntaxe", etat: "TERMINE", progression: 100, ressources: []}]},
        {id: 2, titre: "Pratique", etat: "DISPONIBLE", progression: 0,
          chapitres: [{id: 4, titre: "Projet", etat: "DISPONIBLE", progression: 0, ressources: []},
            {id: 5, titre: "Expert", etat: "VERROUILLE", progression: 0, ressources: []}]},
      ],
    };
    apiMock.mockImplementation(async (path) => path.includes("/parcours") ? journey : []);
    render(<LearningJourneyPage />);

    expect(await screen.findByText("Java moderne")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", {name: "Progression du cours"})).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByRole("heading", {name: "Aucune ressource disponible"})).toBeInTheDocument();
    expect(screen.getByText("Fondations")).toBeInTheDocument();
  });

  it("permet au formateur de répondre et de mettre à jour son profil public", async () => {
    currentMock.mockReturnValue(trainer);
    localStorage.setItem("user", JSON.stringify(trainer));
    const review = {
      id: 9, formationId: 7, participant: "Nora", note: 5,
      commentaire: "Très bon parcours.", statut: "PUBLIE" as const,
      createdAt: "2026-07-30T10:00:00Z", updatedAt: "2026-07-30T10:00:00Z", proprietaire: false,
    };
    const profile = {
      id: 2, nom: "Sara", specialite: "Java", biographie: "Formatrice backend.",
      apprenants: 12, moyenneAvis: 5, formations: [],
    };
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/formateur/engagement") return {inscriptions: 12, avisPublies: 1, moyenneAvis: 5, avis: [review]};
      if (path === "/formateurs/2") return profile;
      if (path === "/formateur/avis/9/reponse") return {...review, reponseFormateur: "Merci Nora."};
      if (path === "/formateur/profil-public" && options?.method === "PUT") return {...profile, specialite: "Architecture Java"};
      return {};
    });
    const user = userEvent.setup();
    render(<TrainerEngagementPage />);

    expect(await screen.findByText("Très bon parcours.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Répondre"), "Merci Nora.");
    await user.click(screen.getByRole("button", {name: /Publier la réponse/}));
    expect(await screen.findByText("Merci Nora.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Spécialité"));
    await user.type(screen.getByLabelText("Spécialité"), "Architecture Java");
    await user.click(screen.getByRole("button", {name: "Enregistrer"}));
    expect(await screen.findByText("Profil public mis à jour.")).toBeInTheDocument();
  });

  it("affiche un état vide utile lorsque le formateur ne possède aucune donnée", async () => {
    currentMock.mockReturnValue(trainer);
    localStorage.setItem("user", JSON.stringify(trainer));
    apiMock.mockImplementation(async (path) => {
      if (path === "/formateur/engagement") return {inscriptions: 0, avisPublies: 0, moyenneAvis: 0, avis: []};
      if (path === "/formateurs/2") return {
        id: 2, nom: "Sara", specialite: "", biographie: "", apprenants: 0, moyenneAvis: 0, formations: [],
      };
      return {};
    });

    render(<TrainerEngagementPage />);

    expect(await screen.findByRole("heading", {name: "Aucune donnée d’engagement pour le moment"})).toBeInTheDocument();
    expect(screen.getByText(/Publiez une formation et accueillez vos premiers participants/)).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Voir mes formations"})).toHaveAttribute("href", "/formateur/formations");
    expect(screen.queryByText("Inscriptions réelles")).not.toBeInTheDocument();
  });

  it("distingue une panne serveur et Réessayer relance réellement l’engagement", async () => {
    currentMock.mockReturnValue(trainer);
    localStorage.setItem("user", JSON.stringify(trainer));
    let engagementCalls = 0;
    apiMock.mockImplementation(async (path) => {
      if (path === "/formateur/engagement") {
        engagementCalls += 1;
        if (engagementCalls === 1) throw new ApiRequestError("Internal Server Error", 500);
        return {inscriptions: 0, avisPublies: 0, moyenneAvis: 0, avis: []};
      }
      if (path === "/formateurs/2") return {
        id: 2, nom: "Sara", specialite: "", biographie: "", apprenants: 0, moyenneAvis: 0, formations: [],
      };
      return {};
    });
    const user = userEvent.setup();
    render(<TrainerEngagementPage />);

    expect(await screen.findByRole("heading", {name: "Service d’engagement indisponible"})).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: "Réessayer"}));

    expect(await screen.findByRole("heading", {name: "Aucune donnée d’engagement pour le moment"})).toBeInTheDocument();
    expect(engagementCalls).toBe(2);
  });

  it.each([
    [401, "Session expirée"],
    [403, "Accès formateur refusé"],
  ])("distingue explicitement le statut HTTP %s", async (status, title) => {
    currentMock.mockReturnValue(trainer);
    localStorage.setItem("user", JSON.stringify(trainer));
    apiMock.mockImplementation(async (path) => {
      if (path === "/formateur/engagement") throw new ApiRequestError("Erreur contrôlée", status);
      if (path === "/formateurs/2") return {
        id: 2, nom: "Sara", specialite: "", biographie: "", apprenants: 0, moyenneAvis: 0, formations: [],
      };
      return {};
    });

    render(<TrainerEngagementPage />);
    expect(await screen.findByRole("heading", {name: title})).toBeInTheDocument();
  });

  it("modère un signalement sans modifier la note", async () => {
    currentMock.mockReturnValue({...participant, role: "ADMIN"});
    apiMock.mockImplementation(async (path) =>
      path === "/admin/avis/signalements"
        ? [{id: 1, reviewId: 9, motif: "Contenu à vérifier", createdAt: "2026-07-30T10:00:00Z"}]
        : {});
    const user = userEvent.setup();
    render(<ReviewModerationPage />);

    expect(await screen.findByText("Contenu à vérifier")).toBeInTheDocument();
    await user.click(screen.getByRole("button", {name: /Masquer/}));
    expect(await screen.findByText("Aucun signalement à traiter")).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledWith("/admin/avis/9/moderation", {
      method: "PUT", body: JSON.stringify({statut: "MASQUE"}),
    });
  });

  it("affiche le profil formateur public sans coordonnée privée", async () => {
    currentMock.mockReturnValue(null);
    apiMock.mockResolvedValue({
      id: 7, nom: "Sara", specialite: "Architecture Java", biographie: "Formatrice backend.",
      apprenants: 42, moyenneAvis: 4.8, prochaineClasse: null,
      formations: [{id: 8, titre: "API robustes", categorie: "Java", niveau: "INTERMEDIAIRE"}],
    });
    render(<InstructorPage />);

    expect(await screen.findByRole("heading", {name: "Sara"})).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Voir la formation"})).toHaveAttribute("href", "/catalogue/8");
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("met à jour un favori immédiatement et revient à l’état serveur en cas d’échec", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path, options) => {
      if (path === "/participant/favoris" && !options) return [];
      if (options?.method === "PUT") return {};
      throw new Error("Suppression indisponible");
    });
    render(<FavoriteButton formationId={7} />);

    const button = await screen.findByRole("button", {name: "Ajouter aux favoris"});
    await user.click(button);
    expect(await screen.findByRole("button", {name: "Retirer des favoris"})).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", {name: "Retirer des favoris"}));
    expect(await screen.findByRole("button", {name: "Retirer des favoris"})).toHaveAttribute("aria-pressed", "true");
  });

  it("publie un robots privé et un sitemap limité aux formations réelles", async () => {
    expect(robots().rules).toEqual(expect.objectContaining({
      disallow: expect.arrayContaining(["/profile", "/notifications", "/participant/"]),
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({content: [{id: 7}, {id: 8}]}),
    }));
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toContain("http://localhost:3000/catalogue/7");
    expect(entries).toHaveLength(5);
    vi.unstubAllGlobals();
  });
});
