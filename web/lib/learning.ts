import type {Niveau,ResourceType} from "./formations";
export type CatalogueItem={id:number;titre:string;description:string;imageUrl?:string;langue:string;niveau:Niveau;categorie:string;prix:number;supplementClasses:number;prixAvecClasses:number;offreClasses:boolean;classeActive:boolean;formateur:string;nombreModules:number;nombreChapitres:number;inscrit?:boolean};
export type CataloguePage={content:CatalogueItem[];page:number;size:number;totalElements:number;totalPages:number};
export type PublicResource={id:number;type:ResourceType;titre:string;ordre:number;verrouille:boolean;url?:string};
export type PublicChapter={id:number;titre:string;description?:string;ordre:number;verrouille:boolean;ressources:PublicResource[]};
export type PublicModule={id:number;titre:string;description?:string;ordre:number;apercuGratuit:boolean;verrouille:boolean;chapitres:PublicChapter[]};
export type CatalogueDetail=Omit<CatalogueItem,"offreClasses"|"classeActive">&{
  classesGratuites:boolean;
  classesDisponibles:boolean;
  devise:string;
  formateurId?:number;
  inscrit:boolean;
  typeAcces?:"CONTENU"|"CONTENU_ET_CLASSES"|null;
  modules:PublicModule[];
};
export type ResourceAccess={
  resourceId:number;
  type:ResourceType;
  url:string;
  expiresInSeconds:number;
  telechargeable:boolean;
  titre?:string|null;
  typeMime?:string|null;
  taille?:number|null;
};
export type ProgressResponse={formationId:number;chapitreId:number;termine:boolean;positionVideoSecondes:number;pourcentage:number};
export type QuizParticipant={id:number;titre:string;scoreMinimal:number;important:boolean;tentativesRestantes:number;prochaineDisponibilite?:string|null;dernierPourcentage?:number|null;dernierResultat?:boolean|null;derniereSoumission?:string|null;questions:{id:number;libelle:string;ordre:number;points:number;reponses:{id:number;libelle:string;ordre:number}[]}[]};
export type PlannedQuiz={id:number;titre:string;moduleId?:number|null;moduleTitre?:string|null;chapitreId?:number|null;type:"MODULE"|"FINAL";etat:"VERROUILLE"|"DISPONIBLE"|"REUSSI";reussi:boolean};
export type EvaluationPlan={quizModules:PlannedQuiz[];quizFinal?:PlannedQuiz|null;evaluationsReussies:number;evaluationsObligatoires:number;certificatDisponible:boolean};
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
