import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import CourseDetail from "@/app/catalogue/[id]/page";
import {api,currentUser} from "@/lib/api";
const push=vi.fn();
vi.mock("next/navigation",()=>({useParams:()=>({id:"4"}),useRouter:()=>({push})}));
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn()}));
vi.mock("next/image",()=>({default:()=><span data-testid="next-image"/>}));
const apiMock=vi.mocked(api),current=vi.mocked(currentUser);
const course={id:4,titre:"Java",description:"Cours",langue:"fr",niveau:"DEBUTANT" as const,categorie:"Dev",prix:80,formateur:"Sara",nombreModules:1,nombreChapitres:1,devise:"DH",inscrit:false,modules:[{id:1,titre:"Début",ordre:0,apercuGratuit:true,verrouille:false,chapitres:[{id:2,titre:"Intro",ordre:0,verrouille:false,ressources:[{id:3,type:"YOUTUBE" as const,titre:"Vidéo",ordre:0,verrouille:false}]}]}]};
describe("achat simulé et apprentissage",()=>{
 beforeEach(()=>{apiMock.mockReset();current.mockReset();push.mockReset()});
 it("redirige vers la connexion avant l'achat",async()=>{
  apiMock.mockImplementation(async(path) => path.endsWith("/avis")
   ? {moyenne:0,nombre:0,content:[],page:0,totalPages:0}
   : course);
  current.mockReturnValue(null);const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Simuler l’achat"}));
  expect(push).toHaveBeenCalledWith("/login");
 });
 it("inscrit, ouvre une ressource et met à jour la progression",async()=>{
  current.mockReturnValue({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  let enrolled=false;
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4") return {...course,inscrit:enrolled};
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription"){enrolled=true;return {};}
   if(path==="/catalogue/4/ressources/3/acces") return {resourceId:3,type:"YOUTUBE",url:"https://youtu.be/test",expiresInSeconds:300,telechargeable:false};
   if(options?.method==="PUT") return {pourcentage:100};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Simuler l’achat"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/inscription",{method:"POST"}));
  await user.click(screen.getByRole("button",{name:"YOUTUBE · Vidéo"}));
  expect(await screen.findByText("Ouvrir sur YouTube")).toHaveAttribute("href","https://youtu.be/test");
  await user.click(screen.getByRole("button",{name:"Marquer terminé"}));
  expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/chapitres/2/progression",expect.objectContaining({method:"PUT"}));
 });
});
