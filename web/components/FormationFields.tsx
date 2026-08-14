"use client";

import {useState} from "react";
import {FormationDetail,FormationPayload,Niveau} from "@/lib/formations";

export function FormationFields({initial}:{initial?:FormationDetail}){
  const initialOffer=initial?.classesGratuites?"GRATUITE":(initial?.supplementClasses??0)>0?"PAYANTE":"AUCUNE";
  const [offer,setOffer]=useState(initialOffer);
  return <>
    <label>Titre<input name="titre" required maxLength={180} defaultValue={initial?.titre}/></label>
    <label>Description<textarea name="description" required maxLength={10000} defaultValue={initial?.description}/></label>
    <div className="form-grid">
      <label>Langue<input name="langue" required pattern="[A-Za-z]{2,3}(-[A-Za-z]{2})?" defaultValue={initial?.langue??"fr"}/></label>
      <label>Niveau<select name="niveau" defaultValue={initial?.niveau??"DEBUTANT"}>
        <option value="DEBUTANT">Débutant</option><option value="INTERMEDIAIRE">Intermédiaire</option>
        <option value="AVANCE">Avancé</option><option value="TOUS_NIVEAUX">Tous niveaux</option>
      </select></label>
      <label>Catégorie<input name="categorie" required maxLength={120} defaultValue={initial?.categorie}/></label>
      <label>Prix (DH)<input name="prix" type="number" min="0" step="0.01" required defaultValue={initial?.prix??0}/></label>
      <label>Offre avec classes<select name="offreClasses" value={offer} onChange={event=>setOffer(event.target.value)}>
        <option value="AUCUNE">Aucune offre avec classes</option><option value="PAYANTE">Classes avec supplément</option><option value="GRATUITE">Classes incluses gratuitement</option>
      </select></label>
      <label>Supplément classes (DH)<input name="supplementClasses" type="number" min="0.01" step="0.01" required={offer==="PAYANTE"} disabled={offer!=="PAYANTE"} defaultValue={initialOffer==="PAYANTE"?initial?.supplementClasses:undefined}/></label>
      <input name="classesGratuites" type="hidden" value={offer==="GRATUITE"?"true":"false"}/>
    </div>
  </>;
}

export function formationPayload(form:HTMLFormElement):FormationPayload{
  const data=new FormData(form);
  return {titre:String(data.get("titre")),description:String(data.get("description")),
    langue:String(data.get("langue")),niveau:String(data.get("niveau")) as Niveau,
    categorie:String(data.get("categorie")),prix:Number(data.get("prix")),
    supplementClasses:data.get("offreClasses")==="PAYANTE"?Number(data.get("supplementClasses")):0,
    classesGratuites:data.get("classesGratuites")==="true"};
}
