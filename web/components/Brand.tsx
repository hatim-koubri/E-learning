import Link from "next/link";
import {BookOpenCheck} from "lucide-react";

export function Brand({compact = false}: {compact?: boolean}) {
  return (
    <Link className="brand" href="/" aria-label="NexaLearn, accueil">
      <span className="brand-mark"><BookOpenCheck aria-hidden="true" size={23} /></span>
      {!compact && (
        <span className="brand-copy">
          <strong>NexaLearn</strong>
          <small>Apprendre. Évoluer.</small>
        </span>
      )}
    </Link>
  );
}
