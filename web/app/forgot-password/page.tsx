"use client";

import Link from "next/link";
import {Mail} from "lucide-react";
import {FormEvent, useState} from "react";
import {AuthLayout} from "@/components/AuthLayout";
import {Alert, Button} from "@/components/ui";
import {api} from "@/lib/api";

export default function Page() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = new FormData(event.currentTarget);
      const response = await api<{message: string}>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({email: data.get("email")}),
      });
      setMessage(response.message);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Récupération du compte"
      title="Mot de passe oublié"
      description="Saisissez votre adresse email. La réponse reste identique, que le compte existe ou non."
    >
      <form className="stack" onSubmit={submit}>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.com" />
        </label>
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" loading={busy}>
          {!busy && <Mail size={18} />} Envoyer le lien
        </Button>
        <div className="auth-links"><Link href="/login">Retour à la connexion</Link></div>
      </form>
    </AuthLayout>
  );
}
