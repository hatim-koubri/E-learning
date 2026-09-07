import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import AdminDashboard from "@/app/admin/page";
import {api, currentUser} from "@/lib/api";

vi.mock("next/navigation", () => ({useRouter: () => ({replace: vi.fn()})}));
vi.mock("@/lib/api", () => ({api: vi.fn(), currentUser: vi.fn()}));
const apiMock = vi.mocked(api);
const userMock = vi.mocked(currentUser);
const dashboard = {
  generatedAt: "2026-08-11T10:00:00Z",
  timezone: "UTC",
  periodStart: "2026-07",
  periodEnd: "2026-08",
  indicators: {participants: 3, formateursActifs: 2, formationsPubliees: 1, inscriptionsActives: 2, demandesFormateur: 0, dossiersModeration: 0},
  roleDistribution: {ADMIN: 1, FORMATEUR: 2, PARTICIPANT: 3},
  formationStatusDistribution: {PUBLIEE: 1},
  monthlySeries: [{month: "2026-07", inscriptions: 0, comptesCrees: 1}, {month: "2026-08", inscriptions: 2, comptesCrees: 0}],
  popularFormations: [],
};

describe("dashboard admin réel", () => {
  beforeEach(() => {
    apiMock.mockReset();
    userMock.mockReturnValue({id: 1, nom: "Admin", email: "admin@test.local", role: "ADMIN", statut: "ACTIF", createdAt: ""});
  });

  it("affiche exactement les valeurs API et leur contexte calculable", async () => {
    apiMock.mockResolvedValue(dashboard as never);
    render(<AdminDashboard />);
    expect((await screen.findAllByText("3")).length).toBeGreaterThan(0);
    expect(screen.getByText("50 % des comptes")).toBeInTheDocument();
    expect(screen.getByText("2 nouvelles en août")).toBeInTheDocument();
    expect(screen.getByText(/2026-07 : 0 inscriptions, 1 comptes créés/)).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledWith("/admin/dashboard?months=12");
  });

  it("affiche un état positif quand aucune action ne nécessite de décision", async () => {
    apiMock.mockResolvedValue(dashboard as never);
    render(<AdminDashboard />);
    expect(await screen.findByText("Tout est à jour")).toBeInTheDocument();
    expect(screen.queryByText("Demandes formateur")).not.toBeInTheDocument();
  });

  it("conserve la zone de décision quand une file contient des éléments", async () => {
    apiMock.mockResolvedValue({...dashboard, indicators: {...dashboard.indicators, demandesFormateur: 2}} as never);
    render(<AdminDashboard />);
    expect(await screen.findByText("Demandes formateur")).toBeInTheDocument();
    expect(screen.getByText("Signalements à modérer")).toBeInTheDocument();
    expect(screen.queryByText("Tout est à jour")).not.toBeInTheDocument();
  });

  it("ne remplace pas une erreur par des zéros et permet de réessayer", async () => {
    apiMock.mockRejectedValueOnce(new Error("MySQL indisponible")).mockResolvedValueOnce(dashboard as never);
    render(<AdminDashboard />);
    expect(await screen.findByText("MySQL indisponible")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", {name: "Réessayer"}));
    await waitFor(() => expect(screen.getAllByText("3").length).toBeGreaterThan(0));
  });
});
