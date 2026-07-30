import Link from "next/link";
import {Brand} from "@/components/Brand";
import {GuestOnly} from "@/components/GuestOnly";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>Des parcours structurés, des évaluations utiles et des classes virtuelles réunis dans un espace clair.</p>
        </div>
        <div>
          <h2>Explorer</h2>
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/#fonctionnement">Fonctionnement</Link>
          <GuestOnly>
            <Link href="/register/formateur">Devenir formateur</Link>
          </GuestOnly>
        </div>
        <div>
          <h2>Votre compte</h2>
          <Link href="/login">Connexion</Link>
          <Link href="/register/participant">Inscription participant</Link>
          <Link href="/forgot-password">Mot de passe oublié</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} NexaLearn</span>
        <span>Plateforme E-learning — Projet de stage</span>
      </div>
    </footer>
  );
}
