"use client";

import {BookOpen, Check, Compass, FlaskConical, GraduationCap, UsersRound} from "lucide-react";
import {type KeyboardEvent, type PointerEvent, useEffect, useRef} from "react";

const stages = [
  {label: "Découvrir", description: "Identifier le parcours utile", icon: Compass},
  {label: "Apprendre", description: "Explorer les notions", icon: BookOpen},
  {label: "Pratiquer", description: "Valider par l’action", icon: FlaskConical},
  {label: "Participer", description: "Échanger en direct", icon: UsersRound},
  {label: "Maîtriser", description: "Consolider les acquis", icon: GraduationCap},
];

export function KnowledgePath({
  active = 0,
  compact = false,
  label = "Parcours de connaissance",
}: {
  active?: number;
  compact?: boolean;
  label?: string;
}) {
  const pathRef = useRef<HTMLOListElement>(null);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const frameRef = useRef<number | null>(null);
  const current = Math.min(stages.length - 1, Math.max(0, active));

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  function moveHalo(event: PointerEvent<HTMLOListElement>) {
    if (event.pointerType === "touch") return;
    const element = event.currentTarget;
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      element.style.setProperty("--pointer-x", `${x}px`);
      element.style.setProperty("--pointer-y", `${y}px`);
      element.classList.add("pointer-active");
      frameRef.current = null;
    });
  }

  function hideHalo() {
    const element = pathRef.current;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      element?.classList.remove("pointer-active");
      frameRef.current = null;
    });
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const horizontal = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const vertical = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const direction = horizontal || vertical;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? stages.length - 1
        : (index + direction + stages.length) % stages.length;
    buttonsRef.current[next]?.focus();
  }

  return (
    <ol
      className={compact ? "knowledge-path compact" : "knowledge-path"}
      aria-label={label}
      onPointerMove={moveHalo}
      onPointerLeave={hideHalo}
      ref={pathRef}
    >
      {stages.map(({label: stage, description, icon: Icon}, index) => {
        const state = index < current ? "complete" : index === current ? "current" : "upcoming";
        const stateLabel = state === "complete" ? "terminée" : state === "current" ? "étape active" : "à venir";
        return (
          <li className={state} key={stage} aria-current={state === "current" ? "step" : undefined}>
            <button
              type="button"
              className="knowledge-stage"
              aria-label={`${stage}, ${stateLabel}. ${description}`}
              onKeyDown={(event) => navigate(event, index)}
              ref={(element) => { buttonsRef.current[index] = element; }}
              tabIndex={index === current ? 0 : -1}
            >
              <span className="knowledge-node" aria-hidden="true">
                {state === "complete" ? <Check size={18} /> : <Icon size={19} />}
              </span>
              <span className="knowledge-copy">
                <strong>{stage}</strong>
                {!compact && <small>{description}</small>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
