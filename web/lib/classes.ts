export type Session={id:number;titre:string;dateDebut:string;dateFin:string;fuseauHoraire:string;statut:string};
export type Classe={id:number;formationId:number;formation:string;nom:string;description?:string;capacite:number;dateDebut:string;dateFin:string;statut:string;seances:Session[];membres:{id:number;nom:string;email:string;statut:string}[]};
