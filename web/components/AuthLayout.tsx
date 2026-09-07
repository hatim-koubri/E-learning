import {BookOpenCheck, CalendarCheck2, ShieldCheck} from "lucide-react";
import {ReactNode} from "react";
import {Brand} from "@/components/Brand";
import {PublicHeader} from "@/components/PublicHeader";

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="auth-screen">
      <PublicHeader />
      <main className="auth-page" id="contenu-principal">
        <aside className="auth-story">
          <div className="auth-story-copy">
            <span className="eyebrow">Une plateforme, tous vos apprentissages</span>
            <h2>Chaque compétence commence par une étape.</h2>
            <p>Explorez des parcours structurés, progressez à votre rythme et avancez avec un accompagnement réel.</p>
            <ul className="auth-benefits">
              <li><BookOpenCheck size={20} /> Contenus organisés par modules</li>
              <li><CalendarCheck2 size={20} /> Sessions en direct via Jitsi</li>
              <li><ShieldCheck size={20} /> Accès et progression protégés</li>
            </ul>
          </div>
          <div className="auth-path-preview" aria-hidden="true">
            <div className="auth-path-brand"><Brand compact /></div>
            <span className="auth-path-line" />
            <span><b>01</b> Explorer</span>
            <span><b>02</b> Apprendre</span>
            <span><b>03</b> Réussir</span>
          </div>
          <small>Votre prochaine Khotwa commence ici.</small>
        </aside>
        <section className="auth-panel">
          <div className="auth-card">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className="auth-intro">{description}</p>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
