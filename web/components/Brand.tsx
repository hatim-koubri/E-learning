import Link from "next/link";
import Image from "next/image";

export function Brand({compact = false}: {compact?: boolean}) {
  return (
    <Link className="brand" href="/" aria-label="Khotwa, accueil">
      <span className="brand-mark" aria-hidden="true">
        <Image src="/brand/khotwa-mark.png" alt="" width={42} height={42} priority />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>Khotwa</strong>
          <small>Apprendre. Évoluer.</small>
        </span>
      )}
    </Link>
  );
}
