"use client";

import {LoaderCircle} from "lucide-react";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {currentUser, type User} from "@/lib/api";

export function Protected({
  role,
  roles,
  children,
}: {
  role?: User["role"];
  roles?: User["role"][];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const user = currentUser();
    const authorized = Boolean(
      user &&
      (!role || user.role === role) &&
      (!roles || roles.includes(user.role)),
    );
    if (!authorized) {
      router.replace("/login");
    } else {
      queueMicrotask(() => setOk(true));
    }
  }, [role, roles, router]);

  return ok ? (
    children
  ) : (
    <main className="route-loading" id="contenu-principal">
      <div role="status"><LoaderCircle className="spin" size={28} /> Vérification de votre session…</div>
    </main>
  );
}

export default Protected;
