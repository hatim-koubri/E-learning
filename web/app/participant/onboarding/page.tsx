"use client";

import {ArrowRight, Check, Clock3} from "lucide-react";
import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {AppShell} from "@/components/AppShell";
import {KnowledgePath} from "@/components/KnowledgePath";
import {PageHeader} from "@/components/PageHeader";
import {Protected} from "@/components/Protected";
import {Alert, Button, Card, ErrorState, Skeleton} from "@/components/ui";
import {api, ApiRequestError} from "@/lib/api";
import type {PreferenceFormat, Preferences} from "@/lib/engagement";
import type {Niveau} from "@/lib/formations";

const domains = ["Développement", "Data", "Design", "Gestion", "Langues", "Marketing"];
type LoadState = "loading" | "absent" | "existing" | "error";

function hasStoredPreferences(preferences: Preferences) {
  return preferences.onboardingTermine || preferences.onboardingIgnore
    || preferences.domaines.length > 0 || Boolean(preferences.objectif.trim());
}

function errorMessage(reason: unknown) {
  if (reason instanceof ApiRequestError && reason.status === 401) return "Votre session a expiré. Reconnectez-vous.";
  if (reason instanceof ApiRequestError && reason.status === 403) return "Ce formulaire est réservé aux participants.";
  return reason instanceof Error ? reason.message : "Impossible de charger vos préférences.";
}

export default function OnboardingPage() {
  const router = useRouter();
  const initialized = useRef(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [niveau, setNiveau] = useState<Niveau>("DEBUTANT");
  const [objectif, setObjectif] = useState("");
  const [format, setFormat] = useState<PreferenceFormat>("PRATIQUE");
  const [minutes, setMinutes] = useState(60);
  const [reminders, setReminders] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Preferences | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const preferences = await api<Preferences>("/participant/preferences");
      if (!initialized.current) {
        setSelectedDomains(preferences.domaines);
        setNiveau(preferences.niveau);
        setObjectif(preferences.objectif);
        setMinutes(preferences.minutesHebdomadaires);
        setFormat(preferences.formatPrefere);
        setReminders(preferences.rappelsActifs);
        initialized.current = true;
      }
      setLoadState(hasStoredPreferences(preferences) ? "existing" : "absent");
    } catch (reason) {
      setError(errorMessage(reason));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    // Le chargement initial possède explicitement l'état du formulaire.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function toggleDomain(domain: string) {
    setSelectedDomains((current) =>
      current.includes(domain) ? current.filter((value) => value !== domain) : [...current, domain],
    );
  }

  function applyConfirmed(preferences: Preferences) {
    setSelectedDomains(preferences.domaines);
    setNiveau(preferences.niveau);
    setObjectif(preferences.objectif);
    setMinutes(preferences.minutesHebdomadaires);
    setFormat(preferences.formatPrefere);
    setReminders(preferences.rappelsActifs);
    setConfirmed(preferences);
    setLoadState("existing");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setConfirmed(null);
    try {
      const saved = await api<Preferences>("/participant/preferences", {
        method: "PUT",
        body: JSON.stringify({
          domaines: selectedDomains,
          niveau,
          objectif,
          minutesHebdomadaires: minutes,
          formatPrefere: format,
          rappelsActifs: reminders,
          fuseauHoraire: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Casablanca",
        }),
      });
      applyConfirmed(saved);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/participant/preferences/ignorer-onboarding", {method: "POST"});
      router.replace("/profile");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
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
          actions={<Button variant="ghost" onClick={skip} disabled={busy || loadState === "loading"}>Ignorer pour le moment</Button>}
        />
        <KnowledgePath active={0} compact />
        {loadState === "loading" ? (
          <Card aria-busy="true" aria-label="Chargement de vos préférences">
            <Skeleton className="skeleton-line medium" />
            <Skeleton className="skeleton-cover" />
          </Card>
        ) : loadState === "error" ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <form className="onboarding-layout" onSubmit={submit}>
            <Card className="onboarding-card">
              <Alert variant={loadState === "existing" ? "success" : "info"}>
                {loadState === "existing"
                  ? "Vos préférences enregistrées ont été chargées."
                  : "Aucune préférence enregistrée : vous pouvez créer votre premier parcours personnalisé."}
              </Alert>
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
                  <input
                    value={objectif}
                    onChange={(event) => setObjectif(event.target.value)}
                    required
                    maxLength={300}
                    placeholder="Ex. évoluer vers un poste de développeur"
                  />
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
                <input checked={reminders} onChange={(event) => setReminders(event.target.checked)} type="checkbox" />
                <span><strong>Activer les rappels utiles</strong><small>Facultatif, désactivable à tout moment.</small></span>
              </label>
              {error && <Alert variant="error">{error}</Alert>}
              {confirmed && (
                <Alert variant="success">
                  Préférences confirmées par le serveur : {confirmed.objectif} · {confirmed.minutesHebdomadaires} minutes par semaine.
                </Alert>
              )}
              <div className="form-actions">
                <Button loading={busy} type="submit">
                  {!busy && <ArrowRight size={18} />} Enregistrer mes préférences
                </Button>
                {confirmed && <Button type="button" variant="secondary" onClick={() => router.replace("/profile")}>Accéder à mon profil</Button>}
              </div>
            </Card>
            <aside className="onboarding-aside surface-card">
              <Clock3 size={25} />
              <h2>Un objectif réaliste</h2>
              <p>Seules les activités pédagogiques validées alimentent votre semaine. Laisser une page ouverte ne compte jamais.</p>
            </aside>
          </form>
        )}
      </AppShell>
    </Protected>
  );
}
