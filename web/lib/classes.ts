import {api} from "@/lib/api";

export type Session={id:number;titre:string;dateDebut:string;dateFin:string;fuseauHoraire:string;statut:string;hostReady?:boolean};
export type Classe={id:number;formationId:number;formation:string;nom:string;description?:string;capacite:number;dateDebut:string;dateFin:string;statut:string;seances:Session[];membres:{id:number;nom:string;email:string;statut:string}[]};
export type ParticipantClasse=Omit<Classe,"membres">;

let participantClassesRequest: Promise<ParticipantClasse[]> | null = null;
let participantClassesLoadedAt = 0;
const PARTICIPANT_CLASSES_CACHE_MS = 30_000;

export function loadParticipantClasses({refresh = false}: {refresh?: boolean} = {}) {
  const expired = Date.now() - participantClassesLoadedAt > PARTICIPANT_CLASSES_CACHE_MS;
  if (refresh || !participantClassesRequest || expired) {
    participantClassesRequest = api<ParticipantClasse[]>("/participant/classes")
      .then((classes) => {
        participantClassesLoadedAt = Date.now();
        return classes;
      })
      .catch((error) => {
        participantClassesRequest = null;
        participantClassesLoadedAt = 0;
        throw error;
      });
  }
  return participantClassesRequest;
}

export function prefetchParticipantClasses() {
  void loadParticipantClasses().catch(() => undefined);
}
