export type Niveau="DEBUTANT"|"INTERMEDIAIRE"|"AVANCE"|"TOUS_NIVEAUX";
export type ResourceType="IMAGE"|"VIDEO"|"PDF"|"YOUTUBE";
export type FormationPayload={titre:string;description:string;langue:string;niveau:Niveau;categorie:string;prix:number};
export type Ressource={id:number;type:ResourceType;titre:string;ordre:number;nomOriginal?:string;typeMime?:string;taille?:number;cleStockage?:string;urlYoutube?:string;telechargeable:boolean;statut:string;createdAt:string};
export type Chapitre={id:number;titre:string;description?:string;ordre:number;ressources:Ressource[]};
export type FormationModule={id:number;titre:string;description?:string;ordre:number;apercuGratuit:boolean;chapitres:Chapitre[]};
export type FormationSummary={id:number;titre:string;description:string;imageCouvertureKey?:string;langue:string;niveau:Niveau;categorie:string;prix:number;statut:string;nombreModules:number;createdAt:string;updatedAt:string};
export type FormationDetail=Omit<FormationSummary,"nombreModules">&{modules:FormationModule[]};

export function formatBytes(value?:number){
  if(value===undefined)return "";
  const units=["o","Ko","Mo","Go"];let size=value,index=0;
  while(size>=1024&&index<units.length-1){size/=1024;index++}
  return `${size.toFixed(index?1:0)} ${units[index]}`;
}
