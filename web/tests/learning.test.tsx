import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import CourseDetail from "@/app/catalogue/[id]/page";
import {api,currentUser} from "@/lib/api";
import type {CatalogueDetail} from "@/lib/learning";
const push=vi.fn();
vi.mock("next/navigation",()=>({useParams:()=>({id:"4"}),useRouter:()=>({push})}));
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn()}));
vi.mock("next/image",()=>({default:()=><span data-testid="next-image"/>}));
const apiMock=vi.mocked(api),current=vi.mocked(currentUser);
const course:CatalogueDetail={id:4,titre:"Java",description:"Cours",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:80,supplementClasses:20,prixAvecClasses:100,classesGratuites:false,classesDisponibles:true,formateur:"Sara",nombreModules:1,nombreChapitres:1,devise:"DH",inscrit:false,typeAcces:null,modules:[{id:1,titre:"Début",ordre:0,apercuGratuit:true,verrouille:false,chapitres:[{id:2,titre:"Intro",ordre:0,verrouille:false,ressources:[{id:3,type:"YOUTUBE",titre:"Vidéo",ordre:0,verrouille:false}]}]}]};
describe("achat simulé et apprentissage",()=>{
 beforeEach(()=>{apiMock.mockReset();current.mockReset();push.mockReset()});
 it("redirige vers la connexion avant l'achat",async()=>{
  apiMock.mockImplementation(async(path) => path.endsWith("/avis")
   ? {moyenne:0,nombre:0,content:[],page:0,totalPages:0}
   : course);
  current.mockReturnValue(null);const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Confirmer l’inscription simulée"}));
  expect(push).toHaveBeenCalledWith("/login");
 });
 it("affiche et envoie le prix réel de la formule avec classes",async()=>{
  current.mockReturnValue({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  apiMock.mockImplementation(async(path)=>{
   if(path==="/catalogue/4") return course;
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription-avec-classes") return {montant:100,devise:"DH"};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("radio",{name:/Contenu \+ classes/}));
  expect(screen.getByText("100 DH")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Confirmer l’inscription simulée/}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/inscription-avec-classes",expect.objectContaining({method:"POST"})));
 });
 it("inscrit, ouvre une ressource et met à jour la progression",async()=>{
  current.mockReturnValue({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  let enrolled=false;
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4") return {...course,inscrit:enrolled};
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription"){enrolled=true;return {};}
   if(options?.method==="PUT") return {pourcentage:100};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Confirmer l’inscription simulée"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/inscription",{method:"POST"}));
  await user.click(screen.getByRole("button",{name:"YOUTUBE · Vidéo"}));
  expect(push).toHaveBeenCalledWith("/apprentissage/4?ressource=3");
  await user.click(screen.getByRole("button",{name:"Marquer terminé"}));
  expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/chapitres/2/progression",expect.objectContaining({method:"PUT"}));
 });
 it("affiche un nouveau module vide après une revalidation du programme",async()=>{
  current.mockReturnValue({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  let response:CatalogueDetail={...course,inscrit:true};
  apiMock.mockImplementation(async(path)=>{
   if(path==="/catalogue/4")return response;
   if(path==="/catalogue/4/avis")return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   return {};
  });
  vi.spyOn(document,"visibilityState","get").mockReturnValue("visible");
  render(<CourseDetail/>);
  expect(await screen.findByRole("heading",{name:"Début"})).toBeInTheDocument();

  response={...course,inscrit:true,nombreModules:2,modules:[...course.modules,{
   id:9,titre:"Module ajouté",description:"Bientôt disponible",ordre:1,
   apercuGratuit:false,verrouille:false,chapitres:[],
  }]};
  document.dispatchEvent(new Event("visibilitychange"));

  expect(await screen.findByRole("heading",{name:"Module ajouté"})).toBeInTheDocument();
  expect(screen.getByText("Aucun chapitre disponible pour le moment")).toBeInTheDocument();
  expect(apiMock.mock.calls.filter(([path])=>path==="/catalogue/4")).toHaveLength(2);
 });
});
