import type {Niveau, ResourceType} from "./formations";

export type PreferenceFormat = "VIDEO" | "LECTURE" | "PRATIQUE" | "CLASSE_VIRTUELLE";
export type Preferences = {
  domaines: string[];
  niveau: Niveau;
  objectif: string;
  minutesHebdomadaires: number;
  formatPrefere: PreferenceFormat;
  rappelsActifs: boolean;
  onboardingTermine: boolean;
  onboardingIgnore: boolean;
  fuseauHoraire: string;
};
export type Favorite = {
  id: number;
  formationId: number;
  titre: string;
  categorie: string;
  niveau: Niveau;
  progression: number;
  createdAt: string;
};
export type Resume = {
  formationId: number;
  formationTitre: string;
  moduleId?: number;
  moduleTitre?: string;
  chapitreId?: number;
  chapitreTitre?: string;
  ressourceId?: number;
  ressourceTitre?: string;
  consultedAt: string;
  href: string;
};
export type PrivateNote = {
  id: number;
  formationId: number;
  formationTitre: string;
  chapitreId?: number;
  chapitreTitre?: string;
  ressourceId?: number;
  ressourceTitre?: string;
  contenu?: string;
  signet: boolean;
  createdAt: string;
  updatedAt: string;
};
export type WeeklyGoal = {
  minutesCible: number;
  minutesValidees: number;
  activitesValidees: number;
  pourcentage: number;
  semainesRegulieres: number;
  debutSemaine: string;
  finSemaine: string;
  message: string;
};
export type Recommendation = {
  formationId: number;
  titre: string;
  categorie: string;
  niveau: Niveau;
  prix: number;
  score: number;
  raisons: string[];
};
export type Review = {
  id: number;
  formationId: number;
  participant: string;
  note: number;
  commentaire: string;
  statut: "PUBLIE" | "SIGNALE" | "MASQUE";
  reponseFormateur?: string;
  createdAt: string;
  updatedAt: string;
  proprietaire: boolean;
};
export type ReviewSummary = {
  moyenne: number;
  nombre: number;
  content: Review[];
  page: number;
  totalPages: number;
};
export type NotificationCategory =
  | "CLASSE"
  | "NOUVEAU_CONTENU"
  | "QUIZ"
  | "REPONSE_FORMATEUR"
  | "OBJECTIF_HEBDOMADAIRE"
  | "COMPTE_FORMATEUR"
  | "ACCOUNT_WELCOME"
  | "CERTIFICATE_AVAILABLE";
export type AppNotification = {
  id: number;
  categorie: NotificationCategory;
  titre: string;
  message: string;
  actionUrl?: string;
  lue: boolean;
  createdAt: string;
};
export type NotificationPage = {
  content: AppNotification[];
  nonLues: number;
  page: number;
  totalPages: number;
};
export type NotificationPreference = {
  categorie: NotificationCategory;
  dansApplication: boolean;
  emailActif: boolean;
  configurableDansApplication: boolean;
  configurableEmail: boolean;
};
export type ModerationReport = {
  signalement: {
    id: number;
    motif: string;
    date?: string | null;
    statut: "EN_ATTENTE" | "TRAITE_AVIS_REPUBLIE" | "TRAITE_AVIS_MASQUE";
  };
  avis: {
    id: number;
    note: number;
    commentaire: string;
    statut: "PUBLIE" | "SIGNALE" | "MASQUE";
    createdAt?: string | null;
    updatedAt?: string | null;
    reponseFormateur?: string | null;
  };
  contexte: {
    formationId: number;
    formationTitre: string;
    auteurNom: string;
    formateurNom: string;
  };
  decision?: {
    resultat: "REPUBLIER" | "MASQUER";
    date?: string | null;
    adminId?: number | null;
  } | null;
};
export type ModerationQueue = {
  content: ModerationCase[];
  page: number;
  totalPages: number;
  totalElements: number;
};
export type ModerationCase = {
  avis: ModerationReport["avis"];
  contexte: ModerationReport["contexte"];
  signalements: ModerationReport["signalement"][];
};
export type Dashboard = {
  reprise?: Resume;
  prochaineAction: string;
  progressionGlobale: number;
  objectifHebdomadaire: WeeklyGoal;
  prochaineClasse?: {
    id: number;
    titre: string;
    formation: string;
    dateDebut: string;
    dateFin: string;
    fuseauHoraire: string;
    hostReady: boolean;
  };
  quizDisponibles: number;
  formations: {
    formationId: number;
    titre: string;
    progression: number;
    typeAcces: string;
  }[];
  favoris: Favorite[];
  recommandations: Recommendation[];
  activiteRecente: {
    type: string;
    formation?: string;
    minutesValidees: number;
    occurredAt: string;
  }[];
};
export type LearningJourney = {
  formationId: number;
  titre: string;
  progression: number;
  modules: {
    id: number;
    titre: string;
    etat: string;
    progression: number;
    chapitres: {
      id: number;
      titre: string;
      etat: string;
      progression: number;
      ressources: {id: number; titre: string; type: ResourceType; etat: string}[];
    }[];
  }[];
};
export type InstructorProfile = {
  id: number;
  nom: string;
  specialite?: string;
  biographie?: string;
  apprenants: number;
  moyenneAvis: number;
  formations: {id: number; titre: string; categorie: string; niveau: Niveau}[];
};
