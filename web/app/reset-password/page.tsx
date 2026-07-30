"use client";

import Link from "next/link";
import {KeyRound} from "lucide-react";
import {FormEvent, Suspense, useState} from "react";
import {useSearchParams} from "next/navigation";
import {AuthLayout} from "@/components/AuthLayout";
import {PasswordField} from "@/components/AuthForm";
import {Alert, Button} from "@/components/ui";
import {api} from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = params.get("token");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await api<{message: string}>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({token, password: data.get("password")}),
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
      eyebrow="Sécuriser votre compte"
      title="Nouveau mot de passe"
      description="Choisissez un mot de passe unique que vous n’utilisez sur aucun autre service."
    >
      {!token && <Alert variant="error">Le lien de réinitialisation est incomplet ou invalide.</Alert>}
      <form className="stack" onSubmit={submit}>
        <PasswordField
          hint="8 à 72 caractères, avec majuscule, minuscule, chiffre et caractère spécial."
        />
        {message && <Alert variant="success">{message}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" disabled={!token} loading={busy}>
          {!busy && <KeyRound size={18} />} Modifier
        </Button>
        <div className="auth-links"><Link href="/login">Retour à la connexion</Link></div>
      </form>
    </AuthLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="route-loading"><div>Chargement…</div></main>}>
      <ResetForm />
    </Suspense>
  );
}
