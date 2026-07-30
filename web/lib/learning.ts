import type {Niveau,ResourceType} from "./formations";
export type CatalogueItem={id:number;titre:string;description:string;imageUrl?:string;langue:string;niveau:Niveau;categorie:string;prix:number;formateur:string;nombreModules:number;nombreChapitres:number};
export type CataloguePage={content:CatalogueItem[];page:number;size:number;totalElements:number;totalPages:number};
export type PublicResource={id:number;type:ResourceType;titre:string;ordre:number;verrouille:boolean;url?:string};
export type PublicChapter={id:number;titre:string;description?:string;ordre:number;verrouille:boolean;ressources:PublicResource[]};
export type PublicModule={id:number;titre:string;description?:string;ordre:number;apercuGratuit:boolean;verrouille:boolean;chapitres:PublicChapter[]};
export type CatalogueDetail=CatalogueItem&{devise:string;formateurId?:number;inscrit:boolean;modules:PublicModule[]};
export type ResourceAccess={resourceId:number;type:ResourceType;url:string;expiresInSeconds:number;telechargeable:boolean};
export type QuizParticipant={id:number;titre:string;scoreMinimal:number;important:boolean;tentativesRestantes:number;questions:{id:number;libelle:string;ordre:number;points:number;reponses:{id:number;libelle:string;ordre:number}[]}[]};
export type QuizResult={
  tentativeId:number;
  score:number;
  scoreMaximal:number;
  pourcentage:number;
  reussi:boolean;
  dateSoumission:string;
  feedback:{questionId:number;correcte:boolean;explication?:string}[];
  chapitresARevoir:{chapitreId:number;titre:string}[];
};
export type MyFormation={
  inscriptionId:number;
  formationId:number;
  titre:string;
  typeAcces:"CONTENU"|"CONTENU_ET_CLASSES";
  statut:string;
  progression:number;
  prixPaye:number;
  devise:string;
};
