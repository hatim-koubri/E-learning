import {render, screen, waitFor, within} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import AdminUsers from "@/app/admin/utilisateurs/page";
import {api, currentUser} from "@/lib/api";

const prefetch = vi.fn();
vi.mock("next/navigation", () => ({useRouter: () => ({prefetch})}));
vi.mock("@/lib/api", () => ({api: vi.fn(), currentUser: vi.fn()}));
const apiMock = vi.mocked(api);
const userMock = vi.mocked(currentUser);

const page = {
  content: [{id: 7, nom: "Sara Formatrice", email: "sara@nexa.test", role: "FORMATEUR", statut: "ACTIF", createdAt: "2026-08-01T10:00:00Z", version: 1}],
  page: 0,
  size: 20,
  totalPages: 1,
  totalElements: 1,
};

describe("liste utilisateurs admin", () => {
  beforeEach(() => {
    apiMock.mockReset();
    prefetch.mockReset();
    history.replaceState(null, "", "/admin/utilisateurs");
    userMock.mockReturnValue({id: 1, nom: "Admin", email: "admin@nexa.test", role: "ADMIN", statut: "ACTIF", createdAt: ""});
  });

  it("reproduit la structure des lignes pendant le chargement", async () => {
    let resolve!: (value: typeof page) => void;
    apiMock.mockReturnValue(new Promise((done) => { resolve = done; }) as never);
    render(<AdminUsers />);
    const skeleton = await screen.findByLabelText("Chargement des utilisateurs");
    expect(skeleton.querySelectorAll(".skeleton-avatar")).toHaveLength(4);
    expect(skeleton.querySelectorAll(".skeleton-badge")).toHaveLength(4);
    expect(skeleton.querySelectorAll(".skeleton-button")).toHaveLength(4);
    resolve(page);
    await screen.findByText("Sara Formatrice");
  });

  it("rend toute la ligne accessible comme lien vers le compte", async () => {
    apiMock.mockResolvedValue(page as never);
    render(<AdminUsers />);
    const row = await screen.findByRole("link", {name: "Consulter le compte de Sara Formatrice"});
    expect(row).toHaveAttribute("href", "/admin/utilisateurs/7");
    expect(within(row).getByText("ACTIF")).toBeInTheDocument();
    await waitFor(() => expect(prefetch).toHaveBeenCalledWith("/admin/utilisateurs/7"));
  });
});
