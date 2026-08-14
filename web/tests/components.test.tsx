import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe,expect,it,vi} from "vitest";
import {FormationFields,formationPayload} from "@/components/FormationFields";
import {Protected} from "@/components/Protected";

const replace=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>({replace})}));

describe("composants métier",()=>{
 it("construit le DTO de formation depuis le formulaire",async()=>{
  const user=userEvent.setup();
  render(<form data-testid="form"><FormationFields/></form>);
  await user.type(screen.getByLabelText("Titre"),"Architecture");
  await user.type(screen.getByLabelText("Description"),"Cours complet");
  await user.clear(screen.getByLabelText("Catégorie")); await user.type(screen.getByLabelText("Catégorie"),"Java");
  await user.clear(screen.getByLabelText("Prix (DH)")); await user.type(screen.getByLabelText("Prix (DH)"),"149.90");
  const form=screen.getByTestId("form") as HTMLFormElement;
  expect(formationPayload(form)).toMatchObject({titre:"Architecture",description:"Cours complet",langue:"fr",categorie:"Java",prix:149.9,niveau:"DEBUTANT"});
 });
 it("affiche les valeurs initiales",()=>{
  render(<form><FormationFields initial={{id:2,titre:"Java",description:"Desc",langue:"en",niveau:"AVANCE",categorie:"Dev",prix:20,statut:"BROUILLON",createdAt:"",updatedAt:"",modules:[]}}/></form>);
  expect(screen.getByDisplayValue("Java")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Avancé")).toBeInTheDocument();
 });
 it("autorise le rôle attendu",async()=>{
  localStorage.setItem("user",JSON.stringify({role:"PARTICIPANT"}));
  render(<Protected role="PARTICIPANT"><p>Contenu privé</p></Protected>);
  await waitFor(()=>expect(screen.getByText("Contenu privé")).toBeInTheDocument());
  expect(replace).not.toHaveBeenCalled();
 });
 it("redirige un utilisateur absent ou du mauvais rôle",async()=>{
  render(<Protected role="ADMIN"><p>Administration</p></Protected>);
  await waitFor(()=>expect(replace).toHaveBeenCalledWith("/login"));
 });
});
