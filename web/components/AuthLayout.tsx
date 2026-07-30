import {BookOpenCheck, CalendarCheck2, ShieldCheck} from "lucide-react";
import {ReactNode} from "react";
import {Brand} from "@/components/Brand";
import {ThemeToggle} from "@/components/ThemeToggle";

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
    <main className="auth-page" id="contenu-principal">
      <aside className="auth-story">
        <div className="auth-back"><Brand /></div>
        <div>
          <span className="eyebrow">Une plateforme, tous vos apprentissages</span>
          <h2>Progressez avec un parcours clair et un accompagnement réel.</h2>
          <p>Cours structurés, quiz corrigés côté serveur et classes virtuelles sécurisées.</p>
          <ul className="auth-benefits">
            <li><BookOpenCheck size={20} /> Contenus organisés par modules</li>
            <li><CalendarCheck2 size={20} /> Sessions en direct via Jitsi</li>
            <li><ShieldCheck size={20} /> Accès et progression protégés</li>
          </ul>
        </div>
        <small>Apprendre à votre rythme, sans perdre le fil.</small>
      </aside>
      <section className="auth-panel">
        <div className="auth-theme"><ThemeToggle /></div>
        <div className="auth-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-intro">{description}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
