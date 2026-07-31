import {BookOpen, Check, Compass, FlaskConical, GraduationCap, UsersRound} from "lucide-react";

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
  return (
    <ol className={compact ? "knowledge-path compact" : "knowledge-path"} aria-label={label}>
      {stages.map(({label: stage, description, icon: Icon}, index) => {
        const state = index < active ? "complete" : index === active ? "current" : "upcoming";
        return (
          <li className={state} key={stage} aria-current={state === "current" ? "step" : undefined}>
            <span className="knowledge-node" aria-hidden="true">
              {state === "complete" ? <Check size={18} /> : <Icon size={19} />}
            </span>
            <span className="knowledge-copy">
              <strong>{stage}</strong>
              {!compact && <small>{description}</small>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
