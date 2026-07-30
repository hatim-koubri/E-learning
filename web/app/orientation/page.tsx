"use client";

import {ArrowLeft, ArrowRight, CheckCircle2, Compass, ShieldCheck} from "lucide-react";
import Link from "next/link";
import {useState} from "react";
import {Footer} from "@/components/Footer";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PublicHeader} from "@/components/PublicHeader";
import {Alert, Badge, Button, Card, EmptyState, ProgressBar} from "@/components/ui";
import {api} from "@/lib/api";
import type {PreferenceFormat, Recommendation} from "@/lib/engagement";
import type {Niveau} from "@/lib/formations";

const steps = ["Objectif", "Niveau", "Domaine", "Temps", "Format"];
const domains = ["Développement", "Data", "Design", "Gestion", "Langues", "Marketing"];

export default function OrientationPage() {
  const [step, setStep] = useState(0);
  const [objective, setObjective] = useState("");
  const [level, setLevel] = useState<Niveau>("DEBUTANT");
  const [domain, setDomain] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [format, setFormat] = useState<PreferenceFormat>("PRATIQUE");
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setBusy(true);
    setError("");
    try {
      setResults(await api<Recommendation[]>("/orientation/recommandations", {
        method: "POST",
        body: JSON.stringify({
          objectif: objective,
          niveau: level,
          domaine: domain,
          minutesHebdomadaires: minutes,
          formatPrefere: format,
        }),
      }));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const canContinue = step !== 0 || objective.trim().length > 2;
  const canFinish = domain.length > 0;

  return (
    <div className="orientation-page">
      <PublicHeader />
      <main id="contenu-principal">
        <section className="orientation-hero">
          <div className="container">
            <span className="eyebrow"><Compass size={16} /> Orientation transparente</span>
            <h1>Trouvez un point de départ qui vous ressemble</h1>
            <p>Cinq réponses suffisent. Les résultats reposent sur des règles lisibles et uniquement sur les formations réellement publiées.</p>
            <KnowledgePath active={results ? 1 : 0} compact />
          </div>
        </section>
        <section className="container orientation-content">
          {!results ? (
            <Card className="orientation-card">
              <div className="orientation-progress">
                <span>Question {step + 1} sur {steps.length}</span>
                <strong>{steps[step]}</strong>
                <ProgressBar value={((step + 1) / steps.length) * 100} label={`Étape ${step + 1} sur ${steps.length}`} />
              </div>
              {step === 0 && (
                <label>
                  Quel objectif professionnel souhaitez-vous atteindre ?
                  <textarea
                    autoFocus
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    maxLength={300}
                    placeholder="Ex. préparer une reconversion vers le développement web"
                  />
                </label>
              )}
              {step === 1 && (
                <fieldset><legend>Quel est votre niveau actuel ?</legend>
                  <div className="choice-grid">
                    {(["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "TOUS_NIVEAUX"] as Niveau[]).map((value) => (
                      <button className={level === value ? "choice-card selected" : "choice-card"} type="button" key={value} onClick={() => setLevel(value)}>
                        {value.toLowerCase().replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {step === 2 && (
                <fieldset><legend>Quel domaine vous attire ?</legend>
                  <div className="choice-grid">
                    {domains.map((value) => (
                      <button className={domain === value ? "choice-card selected" : "choice-card"} type="button" key={value} onClick={() => setDomain(value)}>
                        {value}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {step === 3 && (
                <fieldset><legend>Combien de temps pouvez-vous consacrer chaque semaine ?</legend>
                  <div className="choice-grid">
                    {[30, 60, 120, 180].map((value) => (
                      <button className={minutes === value ? "choice-card selected" : "choice-card"} type="button" key={value} onClick={() => setMinutes(value)}>
                        {value < 60 ? `${value} minutes` : `${value / 60} heure${value > 60 ? "s" : ""}`}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {step === 4 && (
                <fieldset><legend>Quel format vous aide le plus ?</legend>
                  <div className="choice-grid">
                    {([
                      ["VIDEO", "Vidéo"],
                      ["LECTURE", "Lecture"],
                      ["PRATIQUE", "Pratique"],
                      ["CLASSE_VIRTUELLE", "Classe virtuelle"],
                    ] as [PreferenceFormat, string][]).map(([value, label]) => (
                      <button className={format === value ? "choice-card selected" : "choice-card"} type="button" key={value} onClick={() => setFormat(value)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {error && <Alert variant="error">{error}</Alert>}
              <div className="orientation-actions">
                <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep((value) => value - 1)}>
                  <ArrowLeft size={17} /> Précédent
                </Button>
                {step < steps.length - 1 ? (
                  <Button disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>
                    Continuer <ArrowRight size={17} />
                  </Button>
                ) : (
                  <Button loading={busy} disabled={!canFinish} onClick={finish}>
                    {!busy && <CheckCircle2 size={17} />} Voir mes recommandations
                  </Button>
                )}
              </div>
              <p className="privacy-note"><ShieldCheck size={16} /> Vos réponses restent dans cette page et ne sont pas enregistrées.</p>
            </Card>
          ) : (
            <div className="orientation-results">
              <div className="section-heading">
                <div><span className="eyebrow">Votre sélection</span><h2>Des formations expliquées, pas imposées</h2></div>
                <Button variant="secondary" onClick={() => setResults(null)}>Modifier mes réponses</Button>
              </div>
              {results.length ? (
                <div className="recommendation-grid">
                  {results.map((item) => (
                    <Card key={item.formationId}>
                      <Badge variant="primary">{item.categorie}</Badge>
                      <h2>{item.titre}</h2>
                      <ul className="reason-list">{item.raisons.map((reason) => <li key={reason}><CheckCircle2 size={16} />{reason}</li>)}</ul>
                      <div className="course-card-footer">
                        <strong>{item.prix === 0 ? "Gratuite" : `${item.prix} DH`}</strong>
                        <Link className="btn btn-secondary" href={`/catalogue/${item.formationId}`}>Voir la formation</Link>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState title="Aucune formation correspondante" description="Le catalogue publié ne contient pas encore de formation pour ces critères." />
              )}
              <Card className="save-orientation">
                <div><h2>Retrouver cette sélection plus tard</h2><p>Créez un compte uniquement si vous souhaitez enregistrer vos préférences et suivre votre progression.</p></div>
                <Link className="btn btn-primary" href="/register/participant">Créer un compte</Link>
              </Card>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
