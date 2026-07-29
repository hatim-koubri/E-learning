import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import AdminPage from "@/app/admin/formateurs/page";
import ProfilePage from "@/app/profile/page";
import FormationsPage from "@/app/formateur/formations/page";
import FormationEditor from "@/app/formateur/formations/[id]/page";
import LoginPage from "@/app/login/page";
import ParticipantRegister from "@/app/register/participant/page";
import TrainerRegister from "@/app/register/formateur/page";
import {api,currentUser,logout} from "@/lib/api";
const push=vi.fn(),replace=vi.fn();
vi.mock("next/navigation",()=>({useParams:()=>({id:"12"}),useRouter:()=>({push,replace})}));
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn(),logout:vi.fn(),saveSession:vi.fn()}));
const apiMock=vi.mocked(api),userMock=vi.mocked(currentUser);
describe("espaces applicatifs",()=>{
 beforeEach(()=>{apiMock.mockReset();userMock.mockReset();push.mockReset();replace.mockReset()});
 it("affiche les pages publiques d'authentification",()=>{
  render(<LoginPage/>);expect(screen.getByText("Bienvenue")).toBeInTheDocument();
  render(<ParticipantRegister/>);expect(screen.getByText(/Inscription participant/)).toBeInTheDocument();
  render(<TrainerRegister/>);expect(screen.getByText(/administrateur/)).toBeInTheDocument();
 });
 it("liste et accepte une demande formateur",async()=>{
  userMock.mockReturnValue({id:1,nom:"Admin",email:"a@t",role:"ADMIN",statut:"ACTIF",createdAt:""});
  apiMock.mockResolvedValueOnce([{id:3,nom:"Sara",email:"s@t",statut:"EN_ATTENTE",createdAt:"2026-01-01"}]).mockResolvedValueOnce({}).mockResolvedValueOnce([]);
  const user=userEvent.setup();render(<AdminPage/>);await user.click(await screen.findByRole("button",{name:"Accepter"}));
  expect(apiMock).toHaveBeenCalledWith("/admin/formateurs/3/accepter",{method:"PATCH"});
 });
 it("charge le profil et permet la déconnexion",async()=>{
  userMock.mockReturnValue({id:2,nom:"Pat",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  apiMock.mockResolvedValue({id:2,nom:"Pat",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  const user=userEvent.setup();render(<ProfilePage/>);expect(await screen.findByText("Pat")).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"Se déconnecter"}));expect(logout).toHaveBeenCalled();
 });
 it("affiche et crée une formation",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  apiMock.mockResolvedValueOnce([]).mockResolvedValueOnce({id:20});
  const user=userEvent.setup();render(<FormationsPage/>);await user.click(await screen.findByRole("button",{name:"Nouvelle formation"}));
  await user.type(screen.getByLabelText("Titre"),"Cours");await user.type(screen.getByLabelText("Description"),"Description");await user.type(screen.getByLabelText("Catégorie"),"Dev");
  await user.click(screen.getByRole("button",{name:"Créer et structurer"}));await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations",expect.objectContaining({method:"POST"})));
 });
 it("charge l'éditeur pédagogique et publie",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Cours",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[]};
  apiMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({}).mockResolvedValueOnce({...detail,statut:"PUBLIEE"});
  const user=userEvent.setup();render(<FormationEditor/>);await user.click(await screen.findByRole("button",{name:"Publier"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations/12/statut",expect.objectContaining({method:"PUT"})));
 });
 it("ajoute un module dans l'éditeur pédagogique",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Cours",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[]};
  apiMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({}).mockResolvedValueOnce(detail);
  const user=userEvent.setup();render(<FormationEditor/>);const title=await screen.findByPlaceholderText("Titre du module");
  await user.type(title,"Fondations");await user.click(screen.getByRole("button",{name:"Ajouter"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations/12/modules",expect.objectContaining({method:"POST"})));
 });
});
