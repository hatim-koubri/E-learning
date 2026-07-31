import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import Catalogue from "@/app/catalogue/page";
import {api} from "@/lib/api";
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn(() => null)}));
vi.mock("next/image",()=>({default:()=><span data-testid="next-image"/>}));

const apiMock=vi.mocked(api);
describe("catalogue",()=>{
 beforeEach(()=>apiMock.mockReset());
 it("affiche les résultats, prix, pagination et recherche",async()=>{
  apiMock.mockResolvedValue({content:[{id:7,titre:"Spring",description:"API",langue:"fr",niveau:"DEBUTANT",categorie:"Java",prix:99,formateur:"Sam",nombreModules:2,nombreChapitres:5}],page:0,size:9,totalElements:1,totalPages:1});
  const user=userEvent.setup();render(<Catalogue/>);
  expect(await screen.findByText("Spring")).toBeInTheDocument();
  expect(screen.getByText("99 DH")).toBeInTheDocument();
  await user.type(screen.getByPlaceholderText("Titre, catégorie ou mot-clé"),"boot");
  await user.click(screen.getByRole("button",{name:"Rechercher"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith(expect.stringContaining("boot")));
 });
 it("affiche l'état vide",async()=>{
  apiMock.mockResolvedValueOnce({content:[],page:0,size:9,totalElements:0,totalPages:0});
  render(<Catalogue/>);expect(await screen.findByText("Aucun résultat")).toBeInTheDocument();
 });
});
