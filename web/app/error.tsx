"use client";

import {ErrorState} from "@/components/ui";

export default function GlobalError({error, reset}: {error: Error; reset: () => void}) {
  return (
    <main className="route-error" id="contenu-principal">
      <ErrorState message={error.message || "Une erreur inattendue est survenue."} onRetry={reset} />
    </main>
  );
}
