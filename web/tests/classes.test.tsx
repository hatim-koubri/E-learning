import{render,screen,waitFor,within}from"@testing-library/react";import userEvent from"@testing-library/user-event";import{beforeEach,describe,expect,it,vi}from"vitest";
import TrainerClasses from"@/app/formateur/classes/page";import ParticipantClasses from"@/app/participant/classes/page";import{api,currentUser}from"@/lib/api";
const replace=vi.fn();vi.mock("next/navigation",()=>({useRouter:()=>({replace})}));vi.mock("@/lib/api",()=>({api:vi.fn(),currentUser:vi.fn()}));
const call=vi.mocked(api),who=vi.mocked(currentUser);
const formation={id:4,titre:"Spring",description:"Cours",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:100,supplementClasses:25,classesGratuites:false,statut:"PUBLIEE",nombreModules:1,createdAt:"",updatedAt:""};
const classe={id:8,formationId:4,formation:"Spring",nom:"Groupe A",capacite:10,dateDebut:"2026-08-01",dateFin:"2026-08-30",statut:"ACTIVE",membres:[],seances:[{id:9,titre:"Direct",dateDebut:new Date(Date.now()-60_000).toISOString(),dateFin:new Date(Date.now()+3_600_000).toISOString(),fuseauHoraire:"Africa/Casablanca",statut:"PLANIFIEE",hostReady:true}]};
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
 it("planifie plusieurs séances avec une heure de début et une durée",async()=>{
  who.mockReturnValue({id:1,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([classe]).mockResolvedValueOnce([formation]).mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce([classe]).mockResolvedValueOnce([formation]);
  const user=userEvent.setup();render(<TrainerClasses/>);const plan=await screen.findByRole("button",{name:"Planifier"});const form=plan.closest("form")!;const fields=within(form);
  await user.type(fields.getByLabelText("Titre"),"Atelier récurrent");await user.type(fields.getByLabelText("Date de début"),"2026-08-03");await user.type(fields.getByLabelText("Heure de début"),"09:00");await user.selectOptions(fields.getByLabelText("Durée"),"90");await user.click(fields.getByLabelText("Planifier plusieurs séances"));await user.click(fields.getByLabelText("Lun"));await user.click(fields.getByLabelText("Mer"));await user.type(fields.getByLabelText("Jusqu’au"),"2026-08-05");await user.click(plan);
  await waitFor(()=>expect(call.mock.calls.filter(([path])=>path==="/formateur/classes/8/seances")).toHaveLength(2));
  const bodies=call.mock.calls.filter(([path])=>path==="/formateur/classes/8/seances").map(([,options])=>JSON.parse(String(options?.body)));
 expect(new Date(bodies[0].dateFin).getTime()-new Date(bodies[0].dateDebut).getTime()).toBe(90*60_000);
 });
 it("crée la classe et son calendrier de séances en une seule validation",async()=>{
  who.mockReturnValue({id:1,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([]).mockResolvedValueOnce([formation]).mockResolvedValueOnce({...classe,seances:[]}).mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce([]).mockResolvedValueOnce([formation]);
  const user=userEvent.setup();render(<TrainerClasses/>);await user.click(await screen.findByRole("button",{name:"Nouvelle classe"}));const dialog=screen.getByRole("dialog",{name:"Nouvelle classe"});
  await user.selectOptions(within(dialog).getByLabelText("Formation"),"4");await user.type(within(dialog).getByLabelText("Nom"),"Groupe A");await user.type(within(dialog).getByLabelText("Début"),"2026-08-01");await user.type(within(dialog).getByLabelText("Fin"),"2026-08-30");await user.click(within(dialog).getByLabelText("Planifier les séances maintenant"));
  await user.type(within(dialog).getByLabelText("Titre"),"Atelier");await user.type(within(dialog).getByLabelText("Date de début"),"2026-08-03");await user.type(within(dialog).getByLabelText("Heure de début"),"10:00");await user.click(within(dialog).getByLabelText("Planifier plusieurs séances"));await user.click(within(dialog).getByLabelText("Lun"));await user.click(within(dialog).getByLabelText("Mer"));await user.type(within(dialog).getByLabelText("Jusqu’au"),"2026-08-05");await user.click(within(dialog).getByRole("button",{name:"Créer la classe"}));
  await waitFor(()=>expect(call.mock.calls.filter(([path])=>path==="/formateur/classes/8/seances")).toHaveLength(2));expect(call).toHaveBeenCalledWith("/formateur/classes",expect.objectContaining({method:"POST"}));
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
 it("indique que le formateur ouvre la salle en premier avec son identité NexaLearn",async()=>{
  who.mockReturnValue({id:1,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([classe]).mockResolvedValueOnce([formation]);
  const user=userEvent.setup();render(<TrainerClasses/>);
  await user.click(await screen.findByRole("button",{name:"Préparer la séance"}));
  expect(screen.getByRole("dialog",{name:"Salle d’attente NexaLearn"})).toBeInTheDocument();
  expect(screen.getByText(/ouvrirez la salle en premier comme hôte/)).toBeInTheDocument();
  expect(screen.getByText(/nom de compte NexaLearn sera utilisé automatiquement/)).toBeInTheDocument();
 });
 it("désactive la création sans formation publiée proposant des classes",async()=>{
  who.mockReturnValue({id:1,nom:"F",email:"f@t",role:"FORMATEUR",statut:"ACTIF",createdAt:""});
  call.mockResolvedValueOnce([]).mockResolvedValueOnce([{...formation,supplementClasses:0,classesGratuites:false}]);
  render(<TrainerClasses/>);
  expect(await screen.findByRole("button",{name:"Nouvelle classe"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"Créer une classe"})).toBeDisabled();
 });
});
