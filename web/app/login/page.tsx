import Link from "next/link";
import {AuthLayout} from "@/components/AuthLayout";
import {LoginForm} from "@/components/AuthForm";

export default function Page() {
  return (
    <AuthLayout
      eyebrow="Connexion sécurisée"
      title="Bienvenue"
      description="Retrouvez vos cours, votre progression et vos prochaines classes."
    >
      <LoginForm />
      <div className="auth-links" style={{marginTop: 20}}>
        <span>Vous transmettez votre expertise ?</span>
        <Link href="/register/formateur">Devenir formateur</Link>
      </div>
    </AuthLayout>
  );
}
