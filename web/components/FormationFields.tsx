import {FormationDetail,FormationPayload,Niveau} from "@/lib/formations";

export function FormationFields({initial}:{initial?:FormationDetail}){
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
      <label>Prix (MAD)<input name="prix" type="number" min="0" step="0.01" required defaultValue={initial?.prix??0}/></label>
    </div>
  </>;
}

export function formationPayload(form:HTMLFormElement):FormationPayload{
  const data=new FormData(form);
  return {titre:String(data.get("titre")),description:String(data.get("description")),
    langue:String(data.get("langue")),niveau:String(data.get("niveau")) as Niveau,
    categorie:String(data.get("categorie")),prix:Number(data.get("prix"))};
}
