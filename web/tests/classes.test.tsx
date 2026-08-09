import{render,screen,waitFor}from"@testing-library/react";import userEvent from"@testing-library/user-event";import{beforeEach,describe,expect,it,vi}from"vitest";
import TrainerClasses from"@/app/formateur/classes/page";import ParticipantClasses from"@/app/participant/classes/page";import{api,currentUser}from"@/lib/api";
const replace=vi.fn();vi.mock("next/navigation",()=>({useRouter:()=>({replace})}));vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn()}));
const call=vi.mocked(api),who=vi.mocked(currentUser);
const formation={id:4,titre:"Spring",description:"Cours",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:100,supplementClasses:25,classesGratuites:false,statut:"PUBLIEE",nombreModules:1,createdAt:"",updatedAt:""};
const classe={id:8,formationId:4,formation:"Spring",nom:"Groupe A",capacite:10,dateDebut:"2026-08-01",dateFin:"2026-08-30",statut:"ACTIVE",membres:[],seances:[{id:9,titre:"Direct",dateDebut:new Date(Date.now()-60_000).toISOString(),dateFin:new Date(Date.now()+3_600_000).toISOString(),fuseauHoraire:"Africa/Casablanca",statut:"PLANIFIEE"}]};
describe("classes virtuelles",()=>{
 beforeEach(()=>{call.mockReset();who.mockReset();replace.mockReset()});
 it("permet au formateur de planifier et affecter",async()=>{
  who.mockReturnValue({id:1,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([classe]).mockResolvedValueOnce([formation]).mockResolvedValueOnce([{id:3,nom:"Pat",email:"p@t"}]);
  const user=userEvent.setup();render(<TrainerClasses/>);expect(await screen.findByText("Groupe A")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Afficher les participants éligibles"}));expect(await screen.findByText(/p@t/)).toBeInTheDocument();
  call.mockResolvedValueOnce(classe).mockResolvedValueOnce([classe]).mockResolvedValueOnce([formation]).mockResolvedValueOnce([]);
  await user.click(screen.getByRole("button",{name:"Affecter"}));await waitFor(()=>expect(call).toHaveBeenCalledWith("/formateur/classes/8/membres",expect.objectContaining({method:"POST"})));
 });
 it("affiche et ouvre une séance du participant",async()=>{
  who.mockReturnValue({id:2,nom:"P",email:"p@t",role:"PARTICIPANT",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([classe]).mockResolvedValueOnce({joinUrl:"https://meet.jit.si/room"});
  const user=userEvent.setup();render(<ParticipantClasses/>);
  await user.click(await screen.findByRole("button",{name:"Rejoindre Jitsi"}));
  expect(screen.getByRole("dialog",{name:"Salle d’attente NexaLearn"})).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Ouvrir Jitsi"}));
  await waitFor(()=>expect(call).toHaveBeenCalledWith("/participant/seances/9/join"));
 });
});
