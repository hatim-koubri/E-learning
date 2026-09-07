import {render,screen,waitFor,within} from "@testing-library/react";
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
  render(<TrainerRegister/>);expect(screen.getAllByText(/administrateur/).length).toBeGreaterThan(0);
 });
 it("liste et accepte une demande formateur",async()=>{
 userMock.mockReturnValue({id:1,nom:"Admin",email:"a@t",role:"ADMIN",statut:"ACTIF",createdAt:""});
  apiMock.mockResolvedValueOnce({content:[{id:3,nom:"Sara",email:"s@t",statut:"EN_ATTENTE",createdAt:"2026-01-01"}],page:0,totalPages:1,totalElements:1}).mockResolvedValueOnce({}).mockResolvedValueOnce({content:[],page:0,totalPages:0,totalElements:0});
  const user=userEvent.setup();render(<AdminPage/>);await user.click(await screen.findByRole("button",{name:"Accepter"}));
  expect(apiMock).not.toHaveBeenCalledWith("/admin/formateurs/3/accepter",{method:"PATCH"});
  await user.click(screen.getByRole("button",{name:"Confirmer l’acceptation"}));
  expect(apiMock).toHaveBeenCalledWith("/admin/formateurs/3/accepter",{method:"PATCH"});
 });
 it("charge le profil et permet la déconnexion",async()=>{
  userMock.mockReturnValue({id:2,nom:"Pat",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  apiMock.mockImplementation(async(path) => path === "/auth/me"
   ? {id:2,nom:"Pat",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""}
   : {
     prochaineAction:"Choisissez une formation pour commencer.",progressionGlobale:0,reprise:null,
     objectifHebdomadaire:{minutesCible:60,minutesValidees:0,activitesValidees:0,pourcentage:0,semainesRegulieres:0,message:"Chaque étape compte."},
     prochaineClasse:null,quizDisponibles:0,formations:[],favoris:[],recommandations:[],activiteRecente:[]
    });
  const user=userEvent.setup();render(<ProfilePage/>);expect(await screen.findByRole("heading",{name:"Bonjour, Pat"})).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"Déconnexion"}));expect(logout).toHaveBeenCalled();
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
 it("structure l’atelier en six étapes et relie les erreurs de publication",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Parcours long متعدد اللغات",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[{id:8,titre:"Fondations longues",description:"",ordre:0,apercuGratuit:false,chapitres:[]}]};
  apiMock.mockResolvedValueOnce(detail);render(<FormationEditor/>);
  const steps=await screen.findByRole("navigation",{name:"Étapes de conception"});
  expect(steps.querySelectorAll("a")).toHaveLength(6);
  expect(screen.getByRole("link",{name:/Ajouter un chapitre/})).toHaveAttribute("href","#module-8");
  expect(screen.getByRole("button",{name:"Publier la formation"})).toBeDisabled();
 });
 it("n’affiche que les transitions autorisées et confirme l’archivage",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Cours",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,supplementClasses:0,classesGratuites:false,statut:"PUBLIEE",createdAt:"",updatedAt:"",modules:[]};
  apiMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({}).mockResolvedValueOnce({...detail,statut:"ARCHIVEE"});
  const user=userEvent.setup();render(<FormationEditor/>);
  expect(await screen.findByRole("button",{name:"Dépublier"})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Publier"})).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("button",{name:"Archiver"}).at(-1)!);
  expect(screen.getByRole("dialog",{name:"Archiver cette formation ?"})).toBeInTheDocument();
  await user.click(screen.getAllByRole("button",{name:"Archiver"}).at(-1)!);
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations/12/statut",expect.objectContaining({body:JSON.stringify({statut:"ARCHIVEE"})})));
 });
 it("ajoute un module dans l'éditeur pédagogique",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Cours",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[]};
  apiMock.mockResolvedValueOnce(detail).mockResolvedValueOnce({}).mockResolvedValueOnce(detail);
  const user=userEvent.setup();render(<FormationEditor/>);const title=await screen.findByPlaceholderText("Titre du module");
  await user.type(title,"Fondations");await user.click(screen.getByRole("button",{name:"Ajouter"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations/12/modules",expect.objectContaining({method:"POST"})));
 });
 it("garde le brouillon et sa saisie quand le serveur refuse un module",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const detail={id:12,titre:"Cours",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[]};
  apiMock.mockResolvedValueOnce(detail).mockRejectedValueOnce(new Error("Le module doit être complété"));
  const user=userEvent.setup();render(<FormationEditor/>);const title=await screen.findByPlaceholderText("Titre du module");
  expect(screen.queryByRole("link",{name:"Aperçu participant"})).not.toBeInTheDocument();
  expect(screen.getByText("Aperçu disponible après publication")).toBeInTheDocument();
  await user.type(title,"Fondations incomplètes");await user.click(screen.getByRole("button",{name:"Ajouter"}));
  expect(await screen.findByText("Le module doit être complété")).toBeInTheDocument();
  expect(title).toHaveValue("Fondations incomplètes");
 });
 it("modifie, ordonne et enrichit tout le programme pédagogique",async()=>{
  userMock.mockReturnValue({id:4,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  const resource={id:31,titre:"Support PDF",type:"PDF",ordre:0,nomOriginal:"support.pdf",taille:2048,telechargeable:false};
  const chapter={id:21,titre:"Introduction",description:"Bases",ordre:0,ressources:[resource]};
  const modules=[
   {id:8,titre:"Fondations",description:"Module initial",ordre:0,apercuGratuit:false,chapitres:[chapter]},
   {id:9,titre:"Pratique",description:"Exercices",ordre:1,apercuGratuit:false,chapitres:[{...chapter,id:22,titre:"Atelier",ressources:[{...resource,id:32,titre:"Vidéo",type:"VIDEO"}]}]},
  ];
  const detail={id:12,titre:"Cours complet",description:"Desc",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:0,supplementClasses:0,classesGratuites:false,statut:"BROUILLON",createdAt:"",updatedAt:"v1",modules};
  apiMock.mockImplementation(async(path)=>path==="/formateur/formations/12"?detail:{});
  const user=userEvent.setup();render(<FormationEditor/>);
  const first=await screen.findByText("Fondations");
  const article=first.closest("article")!;
  await user.click(within(article).getByRole("button",{name:"Aperçu gratuit"}));
  await user.click(within(article).getByRole("button",{name:"Descendre le module Fondations"}));
  await user.type(within(article).getByPlaceholderText("Nouveau chapitre"),"Chapitre ajouté");
  await user.click(within(article).getByRole("button",{name:"Ajouter le chapitre"}));
  const youtube=within(article).getByText("Ajouter un lien YouTube").closest("form")!;
  await user.type(within(youtube).getByPlaceholderText("Titre"),"Démonstration");
  await user.type(within(youtube).getByPlaceholderText(/youtube/),"https://youtube.com/watch?v=demo");
  await user.click(within(youtube).getByRole("button",{name:"Ajouter le lien"}));
  await user.click(within(article).getAllByRole("button",{name:"Modifier"})[0]);
  const dialog=screen.getByRole("dialog");
  await user.clear(within(dialog).getByLabelText("Titre"));await user.type(within(dialog).getByLabelText("Titre"),"Fondations modernes");
  await user.click(within(dialog).getByRole("button",{name:"Enregistrer"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/modules/8",expect.objectContaining({method:"PUT"})));
  await user.click(within(article).getAllByRole("button",{name:"Supprimer"})[0]);
  const confirmation=screen.getByRole("dialog",{name:"Supprimer ce module ?"});
  await user.click(within(confirmation).getByRole("button",{name:"Supprimer"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/modules/8",{method:"DELETE"}));
 });
});
