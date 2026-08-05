"use client";

import {Heart} from "lucide-react";
import {useEffect, useState} from "react";
import {useResolvedSession} from "@/components/GuestOnly";
import {Button} from "@/components/ui";
import {api} from "@/lib/api";
import type {Favorite} from "@/lib/engagement";

export function FavoriteButton({
  formationId,
  initial = false,
  compact = false,
  onChange,
}: {
  formationId: number;
  initial?: boolean;
  compact?: boolean;
  onChange?: (favorite: boolean) => void;
}) {
  const [favorite, setFavorite] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const {resolved, user} = useResolvedSession();
  const participant = resolved && user?.role === "PARTICIPANT";
  const feedbackId = `favorite-feedback-${formationId}`;

  useEffect(() => {
    if (!participant || initial) return;
    api<Favorite[]>("/participant/favoris")
      .then((items) => setFavorite(items.some((item) => item.formationId === formationId)))
      .catch(() => undefined);
  }, [formationId, initial, participant]);

  if (!resolved || !participant) return null;

  async function toggle() {
    setBusy(true);
    const next = !favorite;
    setFavorite(next);
    onChange?.(next);
    try {
      await api(`/participant/favoris/${formationId}`, {method: next ? "PUT" : "DELETE"});
      setFeedback(next ? "Formation ajoutée aux favoris." : "Formation retirée des favoris.");
    } catch {
      setFavorite(!next);
      onChange?.(!next);
      setFeedback("La modification a été refusée par le serveur. L’état précédent a été restauré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={compact ? "favorite-button compact" : "favorite-button"}
        aria-pressed={favorite}
        aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-describedby={feedback ? feedbackId : undefined}
        loading={busy}
        onClick={toggle}
      >
        {!busy && <Heart size={18} fill={favorite ? "currentColor" : "none"} />}
        {!compact && (favorite ? "Dans mes favoris" : "Ajouter aux favoris")}
      </Button>
      <span className="sr-only" id={feedbackId} aria-live="polite">{feedback}</span>
    </>
  );
}
