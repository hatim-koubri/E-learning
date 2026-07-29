import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {LoginForm,RegisterForm} from "@/components/AuthForm";
import ForgotPassword from "@/app/forgot-password/page";
import ResetPassword from "@/app/reset-password/page";
import {api,saveSession} from "@/lib/api";
const push=vi.fn();
vi.mock("next/navigation",()=>({useRouter:()=>({push}),useSearchParams:()=>new URLSearchParams("token=reset-token")}));
vi.mock("@/lib/api",()=>({api:vi.fn(),saveSession:vi.fn()}));
const apiMock=vi.mocked(api);
describe("formulaires d'authentification",()=>{
 beforeEach(()=>{apiMock.mockReset();push.mockReset()});
 it("connecte et redirige selon le rôle",async()=>{
  apiMock.mockResolvedValue({accessToken:"jwt",user:{id:1,nom:"A",email:"a@t",role:"ADMIN",statut:"ACTIF",createdAt:""}});
  const user=userEvent.setup();render(<LoginForm/>);await user.type(screen.getByLabelText("Email"),"a@t.com");await user.type(screen.getByLabelText("Mot de passe"),"Secret1!");
  await user.click(screen.getByRole("button",{name:"Se connecter"}));
  await waitFor(()=>expect(saveSession).toHaveBeenCalled());expect(push).toHaveBeenCalledWith("/admin/formateurs");
 });
 it("affiche une erreur de connexion",async()=>{
  apiMock.mockRejectedValue(new Error("Identifiants invalides"));const user=userEvent.setup();render(<LoginForm/>);
  await user.type(screen.getByLabelText("Email"),"x@t.com");await user.type(screen.getByLabelText("Mot de passe"),"bad");
  await user.click(screen.getByRole("button",{name:"Se connecter"}));expect(await screen.findByText("Identifiants invalides")).toBeInTheDocument();
 });
 it("valide le mot de passe avant l'inscription",async()=>{
  const user=userEvent.setup();render(<RegisterForm kind="participant"/>);await user.type(screen.getByLabelText("Nom"),"Ada");await user.type(screen.getByLabelText("Email"),"a@t.com");await user.type(screen.getByLabelText("Mot de passe"),"faible");
  await user.click(screen.getByRole("button",{name:"Créer mon compte"}));expect(await screen.findByText(/8 caract/)).toBeInTheDocument();expect(apiMock).not.toHaveBeenCalled();
 });
 it("inscrit un formateur avec confirmation",async()=>{
  apiMock.mockResolvedValue({});const user=userEvent.setup();render(<RegisterForm kind="formateur"/>);await user.type(screen.getByLabelText("Nom"),"Ada");await user.type(screen.getByLabelText("Email"),"a@t.com");await user.type(screen.getByLabelText("Mot de passe"),"Strong1!");
  await user.click(screen.getByRole("button",{name:"Envoyer la demande"}));expect(await screen.findByText(/administrateur/)).toBeInTheDocument();
 });
 it("demande et confirme une réinitialisation",async()=>{
  apiMock.mockResolvedValueOnce({message:"Email envoyé"}).mockResolvedValueOnce({message:"Mot de passe modifié"});
  const user=userEvent.setup();const {unmount}=render(<ForgotPassword/>);await user.type(screen.getByLabelText("Email"),"a@t.com");await user.click(screen.getByRole("button",{name:"Envoyer le lien"}));expect(await screen.findByText("Email envoyé")).toBeInTheDocument();unmount();
  render(<ResetPassword/>);await user.type(screen.getByLabelText("Mot de passe"),"Strong1!");await user.click(screen.getByRole("button",{name:"Modifier"}));expect(await screen.findByText("Mot de passe modifié")).toBeInTheDocument();
 });
});
