import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import QuizPage from "@/app/apprentissage/[formationId]/quiz/page";
import QuizEditor from "@/app/formateur/formations/[id]/quiz/page";
import {api,currentUser} from "@/lib/api";
vi.mock("next/navigation",()=>({useParams:()=>({id:"5",formationId:"5"}),useRouter:()=>({replace:vi.fn()})}));
vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn()}));
const apiMock=vi.mocked(api),currentMock=vi.mocked(currentUser);
describe("quiz",()=>{
 beforeEach(()=>{apiMock.mockReset();currentMock.mockReturnValue({id:1,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""})});
 it("sélectionne une réponse et affiche la correction serveur",async()=>{
  apiMock.mockResolvedValueOnce([{id:8,titre:"QCM",scoreMinimal:50,important:false,tentativesRestantes:3,questions:[{id:9,libelle:"2+2 ?",ordre:0,points:1,reponses:[{id:10,libelle:"4",ordre:0}]}]}]).mockResolvedValueOnce({
   pourcentage:100,reussi:true,feedback:[{questionId:9,libelle:"2+2 ?",correcte:true,explication:"Addition",chapitreId:null,chapitreTitre:null}],chapitresARevoir:[]
  }).mockResolvedValueOnce([]);
  const user=userEvent.setup();render(<QuizPage/>);
  await user.click(await screen.findByLabelText("4"));
  await user.click(screen.getByRole("button",{name:"Soumettre et corriger"}));
  expect(await screen.findByText("Résultat : 100% — réussi")).toBeInTheDocument();
  expect(apiMock).toHaveBeenCalledWith("/participant/quiz/8/tentatives",expect.objectContaining({method:"POST"}));
 });
 it("crée un QCM cohérent côté formateur",async()=>{
  apiMock.mockResolvedValueOnce([]).mockResolvedValueOnce({}).mockResolvedValueOnce([]);
  const user=userEvent.setup();currentMock.mockReturnValue({id:2,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});render(<QuizEditor/>);
  await user.type(await screen.findByPlaceholderText("Titre du quiz"),"Validation");
  await user.type(screen.getByPlaceholderText("Énoncé"),"Question");
  await user.type(screen.getByPlaceholderText("Réponse 1"),"Oui");
  await user.type(screen.getByPlaceholderText("Réponse 2"),"Non");
  await user.click(screen.getByRole("button",{name:"Créer le QCM"}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/formateur/formations/5/quiz",expect.objectContaining({method:"POST"})));
 });
});
