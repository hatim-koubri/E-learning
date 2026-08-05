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
  UsersRound,
} from "lucide-react";
import {useEffect, useState} from "react";
import {CourseCard} from "@/components/CourseCard";
import {Footer} from "@/components/Footer";
import {GuestOnly} from "@/components/GuestOnly";
import {KnowledgePath} from "@/components/KnowledgePath";
import {MagneticLink} from "@/components/MagneticLink";
import {MotionObserver} from "@/components/MotionObserver";
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
                <MagneticLink className="btn btn-primary" href="/orientation">
                  Trouver mon point de départ <ArrowRight size={18} />
                </MagneticLink>
                <Link className="btn btn-secondary" href="/catalogue">Explorer le catalogue</Link>
              </div>
              <div className="trust-line" aria-label="Avantages">
                <span><CheckCircle2 size={17} /> Aperçus gratuits</span>
                <span><CheckCircle2 size={17} /> Progression enregistrée</span>
                <span><CheckCircle2 size={17} /> Classes en direct</span>
              </div>
            </div>
            <div
              className="hero-visual hero-learning-preview"
              aria-label="Aperçu illustratif de l’espace d’apprentissage"
            >
              <div className="hero-preview-card">
                <header className="visual-title">
                  <div>
                    <span className="preview-kicker">Aperçu illustratif</span>
                    <strong>Mon apprentissage</strong>
                    <small>Une vue claire de la prochaine étape</small>
                  </div>
                  <span className="live-chip" aria-label="Exemple de statut : classe en direct">
                    <span className="live-dot" aria-hidden="true" />
                    Classe en direct
                  </span>
                </header>

                <section className="visual-course" aria-label="Exemple de parcours actif à 68 pour cent">
                  <div className="visual-cover" aria-hidden="true"><BookOpen size={28} /></div>
                  <div className="visual-course-copy">
                    <div className="visual-progress-heading">
                      <span className="eyebrow">Parcours actif</span>
                      <strong>68&nbsp;%</strong>
                    </div>
                    <h2>Construire des compétences durables</h2>
                    <progress
                      className="progress-track"
                      value={68}
                      max={100}
                      aria-label="Progression illustrative du parcours"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={68}
                    />
                    <small>Donnée de démonstration</small>
                  </div>
                </section>

                <div className="visual-module-list" aria-label="Exemples d’actions disponibles">
                  <div><CirclePlay size={18} /> <span>Reprendre le dernier chapitre</span></div>
                  <div><ClipboardCheck size={18} /> <span>Préparer le prochain QCM</span></div>
                  <div><UsersRound size={18} /> <span>Rejoindre votre classe</span></div>
                </div>

                <div className="visual-journey">
                  <div>
                    <span className="eyebrow">Le voyage de la connaissance</span>
                    <Award aria-hidden="true" size={20} />
                  </div>
                  <KnowledgePath active={2} compact label="Exemple du parcours de connaissance" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-alt" data-reveal>
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

        <section className="section" data-reveal>
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

        <section className="section section-alt" id="fonctionnement" data-reveal>
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

        <section className="section" data-reveal>
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

        <section className="section section-alt" id="formateurs" data-reveal>
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
              <GuestOnly>
                <Link className="btn btn-secondary" href="/register/formateur">
                  <GraduationCap size={18} /> Devenir formateur
                </Link>
              </GuestOnly>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MotionObserver />
    </div>
  );
}
