export type OrientationProfile={objectif?:string|null;niveau?:string|null;competences:string[];langue?:string|null;budget?:number|null;minutesHebdomadaires?:number|null;formatPedagogique?:string|null;besoinClasses?:boolean|null};
export type OrientationMessage={id:number;role:"USER"|"ASSISTANT";contenu:string;statut:string;modele?:string;dureeMs?:number;createdAt:string};
export type OrientationRecommendation={formationId:number;titre:string;categorie:string;formateur:string;niveau:string;langue:string;prix:number;prixAvecClasses?:number;classesDisponibles:boolean;score:number;rang:number;raisons:string[];modules:string[];href:string};
export type OrientationConversation={id:number;sessionId:string;titre:string;statut:string;profil:OrientationProfile;messages:OrientationMessage[];recommandations:OrientationRecommendation[];createdAt:string;updatedAt:string};
export type SendOrientationResponse={message:OrientationMessage|null;recommandations:OrientationRecommendation[];profil:OrientationProfile};
export type OrientationSummary={id:number;titre:string;statut:string;createdAt:string;updatedAt:string};
