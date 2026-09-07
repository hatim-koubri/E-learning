import {render,screen,waitFor,within} from "@testing-library/react";
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
const participant={id:1,nom:"P",email:"p@t",role:"PARTICIPANT" as const,statut:"ACTIF" as const,createdAt:""};
const course:CatalogueDetail={id:4,titre:"Java",description:"Cours",langue:"fr",niveau:"DEBUTANT",categorie:"Dev",prix:80,supplementClasses:20,prixAvecClasses:100,classesGratuites:false,classesDisponibles:true,formateur:"Sara",nombreModules:1,nombreChapitres:1,devise:"DH",inscrit:false,typeAcces:null,modules:[{id:1,titre:"Début",ordre:0,apercuGratuit:true,verrouille:false,chapitres:[{id:2,titre:"Intro",ordre:0,verrouille:false,ressources:[{id:3,type:"YOUTUBE",titre:"Vidéo",ordre:0,verrouille:false}]}]}]};
async function fillCheckout(user:ReturnType<typeof userEvent.setup>){
 await user.type(screen.getByLabelText("Nom sur la carte"),"Participant Test");
 await user.type(screen.getByLabelText("Numéro de carte"),"4242 4242 4242 4242");
 await user.type(screen.getByLabelText("Date d’expiration"),"12/30");
 await user.type(screen.getByLabelText("CVC"),"123");
}
describe("achat simulé et apprentissage",()=>{
 beforeEach(()=>{apiMock.mockReset();current.mockReset();push.mockReset()});
 it("redirige vers la connexion avant l'achat",async()=>{
  apiMock.mockImplementation(async(path) => path.endsWith("/avis")
   ? {moyenne:0,nombre:0,content:[],page:0,totalPages:0}
   : course);
  current.mockReturnValue(null);const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Continuer vers le paiement"}));
  expect(push).toHaveBeenCalledWith("/login");
 });
 it("affiche et envoie le prix réel de la formule avec classes",async()=>{
  current.mockReturnValue(participant);
  apiMock.mockImplementation(async(path)=>{
   if(path==="/catalogue/4") return course;
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription-avec-classes") return {montant:100,devise:"DH"};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("radio",{name:/Contenu \+ classes/}));
  expect(screen.getByText("100 DH")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Continuer vers le paiement"}));
  expect(await screen.findByRole("dialog",{name:"Finaliser votre inscription"})).toBeInTheDocument();
  expect(screen.getByRole("complementary",{name:"Résumé de la commande"})).toHaveTextContent("Contenu + classes");
  await fillCheckout(user);
  await user.click(screen.getByRole("button",{name:/Confirmer le paiement simulé/}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/inscription-avec-classes",expect.objectContaining({method:"POST"})));
  expect(await screen.findByText("Paiement réussi")).toBeInTheDocument();
 });
 it("inscrit, ouvre une ressource et met à jour la progression",async()=>{
  current.mockReturnValue(participant);
  let enrolled=false;
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4") return {...course,inscrit:enrolled};
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription"){enrolled=true;return {};}
   if(options?.method==="PUT") return {pourcentage:100};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Continuer vers le paiement"}));
  await fillCheckout(user);
  await user.click(screen.getByRole("button",{name:/Confirmer le paiement simulé/}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/inscription",{method:"POST"}));
  const result=await screen.findByRole("status");
  expect(result).toHaveTextContent("Paiement réussi");
  await user.click(within(result).getByRole("button",{name:"Fermer"}));
  await user.click(screen.getByRole("button",{name:"YOUTUBE · Vidéo"}));
  expect(push).toHaveBeenCalledWith("/apprentissage/4?ressource=3");
  await user.click(screen.getByRole("button",{name:"Marquer terminé"}));
  expect(apiMock).toHaveBeenCalledWith("/participant/formations/4/chapitres/2/progression",expect.objectContaining({method:"PUT"}));
 });
 it("affiche une carte d’échec et permet de réessayer le paiement",async()=>{
  current.mockReturnValue(participant);
  apiMock.mockImplementation(async(path)=>{
   if(path==="/catalogue/4") return course;
   if(path==="/catalogue/4/avis") return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/formations/4/inscription") throw new Error("Carte refusée.");
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"Continuer vers le paiement"}));
  await fillCheckout(user);
  await user.click(screen.getByRole("button",{name:/Confirmer le paiement simulé/}));
  const result=await screen.findByRole("status");
  expect(result).toHaveTextContent("Le paiement a échoué");
  expect(result).toHaveTextContent("Carte refusée.");
  await user.click(within(result).getByRole("button",{name:/Réessayer le paiement/}));
  expect(await screen.findByRole("dialog",{name:"Finaliser votre inscription"})).toBeInTheDocument();
 });
 it("affiche un nouveau module vide après une revalidation du programme",async()=>{
  current.mockReturnValue(participant);
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
 it("gère les notes privées et les signets d'un chapitre",async()=>{
  current.mockReturnValue(participant);
  const savedNote={id:11,formationId:4,formationTitre:"Java",chapitreId:2,chapitreTitre:"Intro",contenu:"Résumé utile",signet:false,createdAt:"2026-08-15",updatedAt:"2026-08-15"};
  const bookmark={...savedNote,id:12,contenu:null,signet:true};
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4")return {...course,inscrit:true,typeAcces:"CONTENU"};
   if(path==="/catalogue/4/avis")return {moyenne:0,nombre:0,content:[],page:0,totalPages:0};
   if(path==="/participant/notes?formationId=4")return [];
   if(path==="/participant/formations/4/notes"&&options?.method==="POST"){
    return String(options.body).includes('"signet":true')?bookmark:savedNote;
   }
   if(path==="/participant/notes/12"&&options?.method==="DELETE")return {};
   if(path==="/participant/formations/4/upgrade-classes")return {montant:20,devise:"DH"};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:/Note privée/}));
  await user.type(screen.getByLabelText("Ma note privée"),"Résumé utile");
  await user.click(screen.getByRole("button",{name:"Enregistrer la note"}));
  expect(await screen.findByText("Note privée enregistrée.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:/Placer un signet/}));
  expect(await screen.findByRole("button",{name:/Retirer le signet/})).toHaveAttribute("aria-pressed","true");
  await user.click(screen.getByRole("button",{name:/Retirer le signet/}));
  await waitFor(()=>expect(apiMock).toHaveBeenCalledWith("/participant/notes/12",{method:"DELETE"}));
  await user.click(screen.getByRole("button",{name:/Ajouter les classes/}));
  expect(await screen.findByText(/Option classes ajoutée pour 20 DH/)).toBeInTheDocument();
 });
 it("publie, modifie puis supprime son avis",async()=>{
  current.mockReturnValue(participant);
  const own={id:8,formationId:4,participant:"P",note:4,commentaire:"Un cours vraiment utile",statut:"PUBLIE" as const,createdAt:"2026-08-15",updatedAt:"2026-08-15",proprietaire:true};
  let reviews:{moyenne:number;nombre:number;content:typeof own[];page:number;totalPages:number}={moyenne:0,nombre:0,content:[],page:0,totalPages:0};
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4")return {...course,inscrit:true};
   if(path==="/participant/notes?formationId=4")return [];
   if(path==="/catalogue/4/avis")return reviews;
   if(path==="/participant/formations/4/avis"&&options?.method==="POST"){reviews={moyenne:4,nombre:1,content:[own],page:0,totalPages:1};return own;}
   if(path==="/participant/avis/8"&&options?.method==="PUT"){reviews={...reviews,content:[{...own,note:5,commentaire:"Version encore plus complète"}]};return reviews.content[0];}
   if(path==="/participant/avis/8"&&options?.method==="DELETE"){reviews={moyenne:0,nombre:0,content:[],page:0,totalPages:0};return {};}
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.type(await screen.findByLabelText("Commentaire"),"Un cours vraiment utile");
  await user.selectOptions(screen.getByLabelText("Note"),"4");
  await user.click(screen.getByRole("button",{name:"Publier mon avis"}));
  expect(await screen.findByText("Votre avis a été publié.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Modifier"}));
  const edit=screen.getByLabelText("Commentaire");await user.clear(edit);await user.type(edit,"Version encore plus complète");
  await user.selectOptions(screen.getByLabelText("Note"),"5");
  await user.click(screen.getByRole("button",{name:"Enregistrer"}));
  expect(await screen.findByText("Votre avis a été modifié.")).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Supprimer"}));
  await waitFor(()=>expect(screen.queryByText("Version encore plus complète")).not.toBeInTheDocument());
 });
 it("signale un avis tiers et ouvre une ressource publique",async()=>{
  current.mockReturnValue(participant);
  const other={id:9,formationId:4,participant:"Autre",note:2,commentaire:"Avis contestable mais publié",statut:"PUBLIE" as const,createdAt:"2026-08-15",updatedAt:"2026-08-15",proprietaire:false};
  apiMock.mockImplementation(async(path,options)=>{
   if(path==="/catalogue/4")return course;
   if(path==="/catalogue/4/avis")return {moyenne:2,nombre:1,content:[other],page:0,totalPages:1};
   if(path==="/catalogue/4/ressources/3/acces")return {resourceId:3,type:"YOUTUBE",titre:"Vidéo",url:"https://youtu.be/demo"};
   if(path==="/participant/avis/9/signalement"&&options?.method==="POST")return {};
   return {};
  });
  const user=userEvent.setup();render(<CourseDetail/>);
  await user.click(await screen.findByRole("button",{name:"YOUTUBE · Vidéo"}));
  expect(await screen.findByRole("region",{name:"Lecteur de ressource"})).toBeInTheDocument();
  await user.click(screen.getByRole("button",{name:"Fermer le lecteur"}));
  await user.click(screen.getByRole("button",{name:"Signaler cet avis"}));
  await user.type(screen.getByLabelText("Motif du signalement"),"Contenu inapproprié");
  await user.click(screen.getByRole("button",{name:"Transmettre le signalement"}));
  expect(await screen.findByText("Signalement transmis à la modération.")).toBeInTheDocument();
 });
});
