import {LoaderCircle} from "lucide-react";

export default function Loading() {
  return (
    <main className="route-loading" id="contenu-principal">
      <div role="status">
        <LoaderCircle className="spin" size={30} />
        <span>Chargement de votre espace…</span>
      </div>
    </main>
  );
}
