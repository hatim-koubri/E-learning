import Link from "next/link";
import {AuthLayout} from "@/components/AuthLayout";
import {LoginForm} from "@/components/AuthForm";
import {GuestOnly} from "@/components/GuestOnly";

export default function Page() {
  return (
    <AuthLayout
      eyebrow="Connexion sécurisée"
      title="Bienvenue"
      description="Retrouvez vos cours, votre progression et vos prochaines classes."
    >
      <LoginForm />
      <GuestOnly>
        <div className="auth-links" style={{marginTop: 20}}>
          <span>Vous transmettez votre expertise ?</span>
          <Link href="/register/formateur">Devenir formateur</Link>
        </div>
      </GuestOnly>
    </AuthLayout>
  );
}
