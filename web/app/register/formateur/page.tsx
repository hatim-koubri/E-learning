import {AuthLayout} from "@/components/AuthLayout";
import {RegisterForm} from "@/components/AuthForm";

export default function Page() {
  return (
    <AuthLayout
      eyebrow="Espace formateur"
      title="Partagez votre expertise"
      description="Présentez votre demande. Un administrateur validera votre accès avant votre première connexion."
    >
      <RegisterForm kind="formateur" />
    </AuthLayout>
  );
}
