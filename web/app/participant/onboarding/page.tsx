"use client";

import {ArrowRight, Check, Clock3} from "lucide-react";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {AppShell} from "@/components/AppShell";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Button, Card} from "@/components/ui";
import {api} from "@/lib/api";
import type {PreferenceFormat, Preferences} from "@/lib/engagement";
import type {Niveau} from "@/lib/formations";

const domains = ["Développement", "Data", "Design", "Gestion", "Langues", "Marketing"];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [niveau, setNiveau] = useState<Niveau>("DEBUTANT");
  const [format, setFormat] = useState<PreferenceFormat>("PRATIQUE");
  const [minutes, setMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleDomain(domain: string) {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((value) => value !== domain) : [...current, domain],
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api<Preferences>("/participant/preferences", {
        method: "PUT",
        body: JSON.stringify({
          domaines: selectedDomains,
          niveau,
          objectif: data.get("objectif"),
          minutesHebdomadaires: minutes,
          formatPrefere: format,
          rappelsActifs: data.get("rappels") === "on",
          fuseauHoraire: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca",
        }),
      });
      router.replace("/profile");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await api("/participant/preferences/ignorer-onboarding", {method: "POST"});
      router.replace("/profile");
    } catch (reason) {
      setError((reason as Error).message);
      setBusy(false);
    }
  }

  return (
    <Protected role="PARTICIPANT">
      <AppShell role="PARTICIPANT">
        <PageHeader
          eyebrow="Bienvenue dans votre parcours"
          title="Faisons connaissance"
          description="Ces choix rendent les recommandations plus utiles. Vous pourrez tout modifier plus tard."
          actions={<Button variant="ghost" onClick={skip} disabled={busy}>Ignorer pour le moment</Button>}
        />
        <KnowledgePath active={0} compact />
        <form className="onboarding-layout" onSubmit={submit}>
          <Card className="onboarding-card">
            <fieldset>
              <legend>Quels domaines vous intéressent ?</legend>
              <div className="choice-grid">
                {domains.map((domain) => (
                  <label className={selectedDomains.includes(domain) ? "choice-card selected" : "choice-card"} key={domain}>
                    <input
                      type="checkbox"
                      checked={selectedDomains.includes(domain)}
                      onChange={() => toggleDomain(domain)}
                    />
                    <span><Check size={17} />{domain}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="form-grid">
              <label>
                Votre niveau actuel
                <select value={niveau} onChange={(event) => setNiveau(event.target.value as Niveau)}>
                  <option value="DEBUTANT">Débutant</option>
                  <option value="INTERMEDIAIRE">Intermédiaire</option>
                  <option value="AVANCE">Avancé</option>
                  <option value="TOUS_NIVEAUX">Je ne sais pas encore</option>
                </select>
              </label>
              <label>
                Votre objectif
                <input name="objectif" required maxLength={300} placeholder="Ex. évoluer vers un poste de développeur" />
              </label>
              <label>
                Temps disponible par semaine
                <select value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={120}>2 heures</option>
                  <option value={180}>3 heures</option>
                </select>
              </label>
              <label>
                Format préféré
                <select value={format} onChange={(event) => setFormat(event.target.value as PreferenceFormat)}>
                  <option value="VIDEO">Vidéo</option>
                  <option value="LECTURE">Lecture</option>
                  <option value="PRATIQUE">Pratique</option>
                  <option value="CLASSE_VIRTUELLE">Classe virtuelle</option>
                </select>
              </label>
            </div>
            <label className="consent-row">
              <input name="rappels" type="checkbox" />
              <span><strong>Activer les rappels utiles</strong><small>Facultatif, désactivable à tout moment.</small></span>
            </label>
            {error && <Alert variant="error">{error}</Alert>}
            <div className="form-actions">
              <Button loading={busy} type="submit">
                {!busy && <ArrowRight size={18} />} Personnaliser mon espace
              </Button>
            </div>
          </Card>
          <aside className="onboarding-aside surface-card">
            <Clock3 size={25} />
            <h2>Un objectif réaliste</h2>
            <p>Seules les activités pédagogiques validées alimentent votre semaine. Laisser une page ouverte ne compte jamais.</p>
          </aside>
        </form>
      </AppShell>
    </Protected>
  );
}
