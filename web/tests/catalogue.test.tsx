import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import Catalogue from "@/app/catalogue/page";
import {api} from "@/lib/api";
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn(() => null)}));
vi.mock("next/image",()=>({default:({unoptimized}:{unoptimized?:boolean})=><span data-testid="next-image" data-unoptimized={String(unoptimized)}/>}));

const apiMock=vi.mocked(api);
describe("catalogue",()=>{
 beforeEach(()=>{apiMock.mockReset();localStorage.clear()});
 it("affiche les résultats, prix, pagination et recherche",async()=>{
  apiMock.mockResolvedValue({content:[{id:7,titre:"Spring",description:"API",imageUrl:"http://localhost:9000/signed-cover.jpg?signature=qa",langue:"fr",niveau:"DEBUTANT",categorie:"Java",prix:99,supplementClasses:25,prixAvecClasses:124,offreClasses:true,classeActive:false,formateur:"Sam",nombreModules:2,nombreChapitres:5}],page:0,size:9,totalElements:1,totalPages:1});
  const user=userEvent.setup();render(<Catalogue/>);
  expect(await screen.findByText("Spring")).toBeInTheDocument();
  expect(screen.getByText("99 DH")).toBeInTheDocument();
  expect(screen.getByTestId("next-image")).toHaveAttribute("data-unoptimized","true");
  expect(screen.getByText("Autonome · option classes")).toBeInTheDocument();
  expect(screen.queryByText(/Classe active/)).not.toBeInTheDocument();
  await user.type(screen.getByPlaceholderText("Rechercher par titre, catégorie ou mot-clé…"),"boot");
  await user.click(screen.getByRole("button",{name:"Rechercher"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("boot")));
  await user.selectOptions(screen.getByRole("combobox",{name:"Filtrer par langue"}),"fr");
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("langue=fr")));
 });
 it("affiche l'état vide",async()=>{
  apiMock.mockResolvedValueOnce({content:[],page:0,size:9,totalElements:0,totalPages:0});
  render(<Catalogue/>);expect(await screen.findByText("Aucun résultat")).toBeInTheDocument();
 });
 it("place les formations non acquises avant celles déjà inscrites",async()=>{
  localStorage.setItem("user",JSON.stringify({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""}));
  const enrolled={id:7,titre:"Formation acquise",description:"Déjà suivie",langue:"fr",niveau:"DEBUTANT",categorie:"Java",prix:99,supplementClasses:0,prixAvecClasses:99,offreClasses:false,classeActive:false,formateur:"Sam",nombreModules:2,nombreChapitres:5};
  const discovery={...enrolled,id:8,titre:"Nouvelle formation",description:"À découvrir"};
  apiMock.mockImplementation(async(path)=>{
   if(path==="/participant/tableau-de-bord")return {formations:[{formationId:7,titre:"Formation acquise",progression:50,typeAcces:"CONTENU"}]};
   if(String(path).startsWith("/catalogue?"))return {content:[enrolled,discovery],page:0,size:50,totalElements:2,totalPages:1};
   return [];
  });
  render(<Catalogue/>);
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/tableau-de-bord"));
  await waitFor(()=>expect(Array.from(document.querySelectorAll(".course-card h2")).map((element)=>element.textContent)).toEqual(["Nouvelle formation","Formation acquise"]));
  expect(screen.getByText("Déjà acquise")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/Continuer/})).toHaveAttribute("href","/apprentissage/7");
 });
});
