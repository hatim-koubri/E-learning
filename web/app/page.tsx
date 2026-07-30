"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CirclePlay,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {useEffect, useState} from "react";
import {CourseCard} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {PublicHeader} from "@/components/PublicHeader";
import {ErrorState, PageSkeleton} from "@/components/ui";
import {api} from "@/lib/api";
import type {CataloguePage} from "@/lib/learning";

const benefits = [
  {
    icon: Layers3,
    title: "Des parcours structurés",
    text: "Progressez module après module avec des chapitres, vidéos, PDF et ressources externes réunis au même endroit.",
  },
  {
    icon: ClipboardCheck,
    title: "Des acquis mesurables",
    text: "Validez vos connaissances avec des QCM corrigés côté serveur et suivez une progression réellement enregistrée.",
  },
  {
    icon: CalendarDays,
    title: "Un apprentissage vivant",
    text: "Rejoignez les séances auxquelles vous êtes affecté grâce aux classes virtuelles sécurisées par Jitsi.",
  },
];

export default function Home() {
  const [featured, setFeatured] = useState<CataloguePage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<CataloguePage>("/catalogue?page=0&size=3")
      .then(setFeatured)
      .catch((reason) => setError((reason as Error).message));
  }, []);

  return (
    <div className="landing">
      <PublicHeader />
      <main id="contenu-principal">
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Apprendre avec une direction claire</span>
              <h1>Développez vos compétences, <em>à votre rythme.</em></h1>
              <p>
                NexaLearn réunit cours structurés, évaluations et classes virtuelles pour vous
                aider à passer de la découverte à la maîtrise.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary" href="/catalogue">
                  Explorer les formations <ArrowRight size={18} />
                </Link>
                <Link className="btn btn-secondary" href="/register/formateur">
                  Devenir formateur
                </Link>
              </div>
              <div className="trust-line" aria-label="Avantages">
                <span><CheckCircle2 size={17} /> Aperçus gratuits</span>
                <span><CheckCircle2 size={17} /> Progression enregistrée</span>
                <span><CheckCircle2 size={17} /> Classes en direct</span>
              </div>
            </div>
            <div className="hero-visual" aria-label="Aperçu de l’espace d’apprentissage">
              <div className="live-chip"><span className="live-dot" /><strong>Classe en direct</strong></div>
              <div className="hero-dashboard">
                <div className="visual-title">
                  <div><strong>Mon apprentissage</strong><small>Votre prochaine étape</small></div>
                  <Award size={24} />
                </div>
                <div className="visual-course">
                  <div className="visual-cover"><BookOpen size={28} /></div>
                  <div>
                    <span className="eyebrow">Parcours actif</span>
                    <h3>Construire des compétences durables</h3>
                    <div className="progress-track" aria-hidden="true"><span style={{width: "68%"}} /></div>
                  </div>
                </div>
                <div className="visual-module-list">
                  <div><CirclePlay size={18} /> Reprendre le dernier chapitre</div>
                  <div><ClipboardCheck size={18} /> Préparer le prochain QCM</div>
                  <div><UsersRound size={18} /> Rejoindre votre classe</div>
                </div>
              </div>
              <div className="hero-score"><strong>68%</strong><span>progression du parcours</span></div>
            </div>
          </div>
        </section>

        <section className="section section-alt">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Sélection du catalogue</span>
                <h2>Commencez par une formation publiée</h2>
              </div>
              <Link className="text-link" href="/catalogue">Voir tout le catalogue <ArrowRight size={17} /></Link>
            </div>
            {!featured && !error && <PageSkeleton />}
            {error && <ErrorState message={error} />}
            {featured && featured.content.length > 0 && (
              <div className="course-grid">{featured.content.map((course) => <CourseCard course={course} key={course.id} />)}</div>
            )}
            {featured && featured.content.length === 0 && (
              <div className="state-card">
                <BookOpen size={28} />
                <h2>Le catalogue se prépare</h2>
                <p>Les formations publiées apparaîtront ici dès qu’elles seront disponibles.</p>
              </div>
            )}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Pensée pour progresser</span>
                <h2>Une expérience cohérente de la première leçon à la classe en direct</h2>
              </div>
              <p>Chaque outil répond à une étape du parcours, sans disperser votre apprentissage.</p>
            </div>
            <div className="feature-grid">
              {benefits.map(({icon: Icon, title, text}) => (
                <article className="surface-card feature-card" key={title}>
                  <span className="feature-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="fonctionnement">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Comment ça marche</span>
                <h2>Trois étapes pour transformer une intention en progression</h2>
              </div>
            </div>
            <div className="steps-grid">
              {[
                ["01", "Choisissez votre parcours", "Recherchez une formation publiée et consultez gratuitement son aperçu."],
                ["02", "Apprenez et pratiquez", "Accédez aux ressources débloquées et validez chaque chapitre dans l’ordre."],
                ["03", "Évaluez vos acquis", "Passez les QCM et rejoignez les classes auxquelles vous êtes affecté."],
              ].map(([number, title, text]) => (
                <article className="surface-card step-card" key={number}>
                  <span className="step-number">{number}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Une plateforme complète</span>
                <h2>Contenus, évaluations et accompagnement humain</h2>
              </div>
            </div>
            <div className="preview-grid">
              {[
                [CirclePlay, "Cours multimédias", "Vidéos, documents PDF, images et liens YouTube dans un lecteur responsive."],
                [ClipboardCheck, "Quiz en ligne", "Tentatives contrôlées, seuil de réussite explicite et correction sécurisée."],
                [UsersRound, "Classes virtuelles", "Groupes, séances planifiées et accès Jitsi réservé aux membres affectés."],
              ].map(([Icon, title, text]) => {
                const PreviewIcon = Icon as typeof CirclePlay;
                return (
                  <article className="surface-card preview-card" key={title as string}>
                    <span className="preview-icon"><PreviewIcon size={23} /></span>
                    <h3>{title as string}</h3>
                    <p>{text as string}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section section-alt" id="formateurs">
          <div className="container">
            <div className="cta-band">
              <div>
                <span className="eyebrow">Transmettez votre expertise</span>
                <h2>Créez un parcours qui mérite d’être suivi.</h2>
                <p>
                  Structurez vos modules, publiez vos ressources, préparez vos QCM et animez
                  vos classes depuis un espace formateur dédié.
                </p>
              </div>
              <Link className="btn btn-secondary" href="/register/formateur">
                <GraduationCap size={18} /> Devenir formateur
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
