"use client";

import Link from "next/link";
import {Eye, EyeOff, LogIn, UserPlus} from "lucide-react";
import {FormEvent, useState} from "react";
import {useRouter} from "next/navigation";
import {Alert, Button, IconButton} from "@/components/ui";
import {api, saveSession, type User} from "@/lib/api";
import type {Preferences} from "@/lib/engagement";

function PasswordField({
  name = "password",
  label = "Mot de passe",
  hint,
}: {
  name?: string;
  label?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = `${name}-field`;
  return (
    <div className="stack stack-tight">
      <label htmlFor={inputId}>{label}</label>
      <span className="input-with-action">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          minLength={8}
          required
          autoComplete={hint ? "new-password" : "current-password"}
          aria-describedby={hint ? `${name}-hint` : undefined}
        />
        <IconButton
          type="button"
          label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </IconButton>
      </span>
      {hint && <span className="field-hint" id={`${name}-hint`}>{hint}</span>}
    </div>
  );
}

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await api<{accessToken: string; user: User}>("/auth/login", {
        method: "POST",
        body: JSON.stringify({email: data.get("email"), password: data.get("password")}),
      });
      saveSession(response.accessToken, response.user);
      let participantDestination = "/profile";
      if (response.user.role === "PARTICIPANT") {
        try {
          const preferences = await api<Preferences>("/participant/preferences");
          if (preferences && !preferences.onboardingTermine && !preferences.onboardingIgnore) {
            participantDestination = "/participant/onboarding";
          }
        } catch {
          // La connexion reste utilisable si le chargement facultatif de l'onboarding échoue.
        }
      }
      router.push(
        response.user.role === "ADMIN"
          ? "/admin/formateurs"
          : response.user.role === "FORMATEUR"
            ? "/formateur/formations"
            : participantDestination,
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate={false}>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" />
      </label>
      <PasswordField />
      <div className="auth-links">
        <span />
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <Button loading={busy} type="submit">
        {!busy && <LogIn size={18} />}
        {busy ? "Connexion…" : "Se connecter"}
      </Button>
      <div className="auth-links">
        <span>Pas encore de compte ?</span>
        <Link href="/register/participant">Créer un compte</Link>
      </div>
    </form>
  );
}

export function RegisterForm({kind}: {kind: "participant" | "formateur"}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    const data = new FormData(form);
    const password = String(data.get("password"));
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/.test(password)) {
      setError("Le mot de passe doit contenir 8 caractères, majuscule, minuscule, chiffre et caractère spécial.");
      setBusy(false);
      return;
    }
    try {
      await api(`/auth/register/${kind}`, {
        method: "POST",
        body: JSON.stringify({
          nom: data.get("nom"),
          email: data.get("email"),
          telephone: data.get("telephone"),
          password,
        }),
      });
      setMessage(
        kind === "formateur"
          ? "Demande envoyée. Un administrateur doit la valider."
          : "Compte créé. Vous pouvez vous connecter.",
      );
      form.reset();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>
        Nom
        <input name="nom" required maxLength={120} autoComplete="name" placeholder="Votre nom complet" />
      </label>
      <label>
        Email
        <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" />
      </label>
      <label>
        Téléphone <span className="field-hint">Optionnel</span>
        <input name="telephone" type="tel" maxLength={30} autoComplete="tel" placeholder="+212 6 00 00 00 00" />
      </label>
      <PasswordField
        hint="8 à 72 caractères, avec majuscule, minuscule, chiffre et caractère spécial."
      />
      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <Button loading={busy} type="submit">
        {!busy && <UserPlus size={18} />}
        {busy ? "Envoi…" : kind === "formateur" ? "Envoyer la demande" : "Créer mon compte"}
      </Button>
      <div className="auth-links">
        <span>Vous avez déjà un compte ?</span>
        <Link href="/login">Se connecter</Link>
      </div>
    </form>
  );
}

export {PasswordField};
