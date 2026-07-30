import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {EmptyState} from "@/components/ui";

export default function NotFound() {
  return (
    <main className="route-error" id="contenu-principal">
      <EmptyState
        title="Cette page n’existe pas"
        description="Le lien est peut-être incomplet ou la ressource a été déplacée."
        action={<Link className="btn btn-primary" href="/"><ArrowLeft size={17} /> Revenir à l’accueil</Link>}
      />
    </main>
  );
}
