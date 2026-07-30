import {AuthLayout} from "@/components/AuthLayout";
import {RegisterForm} from "@/components/AuthForm";

export default function Page() {
  return (
    <AuthLayout
      eyebrow="Inscription participant"
      title="Créez votre espace d’apprentissage"
      description="Inscrivez-vous gratuitement pour suivre vos formations et vos résultats."
    >
      <RegisterForm kind="participant" />
    </AuthLayout>
  );
}
