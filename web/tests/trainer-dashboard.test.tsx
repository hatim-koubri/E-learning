import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import TrainerDashboard from "@/app/formateur/page";
import TrainerPublicProfile from "@/app/formateur/profil/page";
import {api, currentUser} from "@/lib/api";
import {openMeeting} from "@/lib/meeting";

vi.mock("@/lib/api", () => ({api: vi.fn(), currentUser: vi.fn()}));
vi.mock("@/lib/meeting", () => ({openMeeting: vi.fn()}));
vi.mock("@/components/Protected", () => ({Protected: ({children}: {children: ReactNode}) => <>{children}</>}));
vi.mock("@/components/AppShell", () => ({AppShell: ({children}: {children: ReactNode}) => <main>{children}</main>}));

const apiMock = vi.mocked(api);
const currentUserMock = vi.mocked(currentUser);
const openMeetingMock = vi.mocked(openMeeting);

describe("tableau de bord formateur", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentUserMock.mockReset();
    openMeetingMock.mockReset();
  });

  it("calcule les priorités réelles et ouvre une séance en direct", async () => {
    const now = Date.now();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    apiMock.mockImplementation(async path => {
      if (path === "/formateur/formations") {
        return [
          {id: 1, titre: "Java", statut: "PUBLIEE"},
          {id: 2, titre: "React", statut: "BROUILLON"},
        ] as never;
      }
      if (path === "/formateur/classes") {
        return [{
          id: 4,
          nom: "Cohorte PFA",
          formation: "Java",
          seances: [{
            id: 9,
            titre: "Revue architecture",
            dateDebut: new Date(now - 60_000).toISOString(),
            dateFin: new Date(now + 60_000).toISOString(),
            fuseauHoraire: "Africa/Casablanca",
            statut: "PLANIFIEE",
          }, {
            id: 10,
            titre: "Atelier suivant",
            dateDebut: tomorrow.toISOString(),
            dateFin: new Date(tomorrow.getTime() + 3_600_000).toISOString(),
            fuseauHoraire: "Africa/Casablanca",
            statut: "PLANIFIEE",
          }],
        }] as never;
      }
      if (path === "/formateur/engagement") {
        return {
          inscriptions: 12,
          avisPublies: 2,
          moyenneAvis: 4.5,
          avis: [{id: 3, reponseFormateur: null}],
        } as never;
      }
      if (path === "/formateur/seances/9/join") {
        return {url: "https://meeting.test/room", token: "ephemeral"} as never;
      }
      throw new Error(`Route inattendue: ${path}`);
    });

    render(<TrainerDashboard />);

    expect(await screen.findByText("Revue architecture")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Moyenne 4.5/5")).toBeInTheDocument();
    expect(screen.getByText("2 action(s)")).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Séances d’aujourd’hui"})).toBeInTheDocument();
    expect(screen.getByRole("heading", {name: "Prochaines séances"})).toBeInTheDocument();
    expect(screen.getAllByRole("button", {name: "Ouvrir"})).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", {name: "Ouvrir"}));
    await waitFor(() => expect(openMeetingMock).toHaveBeenCalledWith(
      {url: "https://meeting.test/room", token: "ephemeral"},
      "/formateur",
    ));

    apiMock.mockRejectedValueOnce(new Error("Accès à la séance refusé"));
    await userEvent.click(screen.getByRole("button", {name: "Ouvrir"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("Accès à la séance refusé");
  });

  it("affiche l'erreur de chargement et permet une nouvelle tentative", async () => {
    apiMock.mockRejectedValueOnce(new Error("Service indisponible"));
    render(<TrainerDashboard />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Service indisponible");
    apiMock.mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce({inscriptions: 0, avisPublies: 0, moyenneAvis: 0, avis: []} as never);

    await userEvent.click(screen.getByRole("button", {name: /réessayer/i}));
    expect(await screen.findByText("Agenda dégagé")).toBeInTheDocument();
    expect(screen.getByText("Aucune formation")).toBeInTheDocument();
  });
});

describe("profil public formateur", () => {
  beforeEach(() => {
    apiMock.mockReset();
    currentUserMock.mockReturnValue({id: 7} as never);
  });

  it("présente les données publiques et les formations publiées", async () => {
    apiMock.mockResolvedValue({
      nom: "Nora El Idrissi",
      specialite: "Architecture logicielle",
      biographie: "Ingénieure et formatrice.",
      apprenants: 18,
      moyenneAvis: 4.8,
      formations: [{id: 5, titre: "Spring Boot", categorie: "Backend", niveau: "AVANCE"}],
    } as never);

    render(<TrainerPublicProfile />);

    expect(await screen.findByText("Nora El Idrissi")).toBeInTheDocument();
    expect(screen.getByText("Architecture logicielle")).toBeInTheDocument();
    expect(screen.getByText("Ingénieure et formatrice.")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Voir la formation"})).toHaveAttribute("href", "/catalogue/5");
    expect(apiMock).toHaveBeenCalledWith("/formateurs/7");
  });

  it("affiche les valeurs de repli quand le profil est incomplet", async () => {
    apiMock.mockResolvedValue({
      nom: "Nora",
      specialite: "",
      biographie: "",
      apprenants: 0,
      moyenneAvis: 0,
      formations: [],
    } as never);

    render(<TrainerPublicProfile />);

    expect(await screen.findByText("Spécialité à renseigner")).toBeInTheDocument();
    expect(screen.getByText("Votre biographie n’est pas encore publiée.")).toBeInTheDocument();
    expect(screen.getByText("Aucune formation publiée")).toBeInTheDocument();
  });
});
