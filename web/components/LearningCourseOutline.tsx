"use client";

import Link from "next/link";
import {Award, BookOpen, Check, ClipboardCheck, FileImage, FileText, LockKeyhole, PlaySquare, Video} from "lucide-react";
import {Button, cn} from "@/components/ui";
import type {LearningJourney} from "@/lib/engagement";
import type {ResourceType} from "@/lib/formations";
import type {EvaluationPlan} from "@/lib/learning";

export type OutlineResource = LearningJourney["modules"][number]["chapitres"][number]["ressources"][number];
export type OutlineChapter = LearningJourney["modules"][number]["chapitres"][number];
export type OutlineModule = LearningJourney["modules"][number];

export function LearningResourceIcon({type}: {type: ResourceType}) {
  if (type === "PDF") return <FileText aria-hidden="true" size={17}/>;
  if (type === "VIDEO") return <Video aria-hidden="true" size={17}/>;
  if (type === "YOUTUBE") return <PlaySquare aria-hidden="true" size={17}/>;
  return <FileImage aria-hidden="true" size={17}/>;
}

export function LearningStatusIcon({state}: {state: string}) {
  if (state === "TERMINE" || state === "REUSSI") return <Check aria-label="Terminé" size={15}/>;
  if (state === "VERROUILLE") return <LockKeyhole aria-label="Verrouillé" size={15}/>;
  return <BookOpen aria-label="Disponible" size={15}/>;
}

export function LearningCourseOutline({
  formationId,
  journey,
  evaluations,
  activeResourceId,
  activeQuizId,
  certificateBusy,
  onSelectResource,
  onDownloadCertificate,
}: {
  formationId: string | number;
  journey: LearningJourney | null;
  evaluations: EvaluationPlan | null;
  activeResourceId?: number | null;
  activeQuizId?: number | null;
  certificateBusy?: boolean;
  onSelectResource?: (module: OutlineModule, chapter: OutlineChapter, resource: OutlineResource) => void;
  onDownloadCertificate?: () => void;
}) {
  const moduleQuizById = new Map((evaluations?.quizModules ?? []).map((quiz) => [quiz.moduleId, quiz]));
  return <nav>
    {journey?.modules.map((module, moduleIndex) => {
      const moduleQuiz = moduleQuizById.get(module.id);
      const moduleActive = module.chapitres.some((chapter) => chapter.ressources.some((resource) => resource.id === activeResourceId))
        || moduleQuiz?.id === activeQuizId;
      return <details className="reader-module" open={moduleActive || moduleIndex === 0 || undefined} key={module.id}>
        <summary><span>{String(moduleIndex + 1).padStart(2, "0")}</span><strong>{module.titre}</strong><LearningStatusIcon state={module.etat}/></summary>
        {module.chapitres.length === 0 && <p className="reader-outline-empty">Aucun chapitre disponible</p>}
        {module.chapitres.map((chapter) => <section className="reader-chapter" key={chapter.id}>
          <div className="reader-chapter-title"><LearningStatusIcon state={chapter.etat}/><strong>{chapter.titre}</strong></div>
          {chapter.ressources.length === 0 && <p className="reader-outline-empty">Aucune ressource</p>}
          {chapter.ressources.map((resource) => onSelectResource ? <button
            type="button"
            className={cn("reader-resource-link", resource.id === activeResourceId && "active")}
            aria-current={resource.id === activeResourceId ? "page" : undefined}
            disabled={resource.etat === "VERROUILLE"}
            onClick={() => onSelectResource(module, chapter, resource)}
            key={resource.id}
          ><LearningResourceIcon type={resource.type}/><span>{resource.titre}</span><LearningStatusIcon state={resource.etat}/></button> : <Link
            className={cn("reader-resource-link", resource.etat === "VERROUILLE" && "disabled")}
            aria-disabled={resource.etat === "VERROUILLE" || undefined}
            tabIndex={resource.etat === "VERROUILLE" ? -1 : undefined}
            href={resource.etat === "VERROUILLE" ? "#" : `/apprentissage/${formationId}?ressource=${resource.id}`}
            key={resource.id}
          ><LearningResourceIcon type={resource.type}/><span>{resource.titre}</span><LearningStatusIcon state={resource.etat}/></Link>)}
        </section>)}
        {moduleQuiz && <Link
          className={cn("reader-resource-link reader-quiz-link", moduleQuiz.etat === "VERROUILLE" && "disabled", moduleQuiz.id === activeQuizId && "active")}
          aria-current={moduleQuiz.id === activeQuizId ? "page" : undefined}
          aria-disabled={moduleQuiz.etat === "VERROUILLE" || undefined}
          tabIndex={moduleQuiz.etat === "VERROUILLE" ? -1 : undefined}
          href={moduleQuiz.etat === "VERROUILLE" ? "#" : `/apprentissage/${formationId}/quiz?quiz=${moduleQuiz.id}`}
        ><ClipboardCheck aria-hidden="true" size={17}/><span>Quiz du module</span><LearningStatusIcon state={moduleQuiz.etat}/></Link>}
      </details>;
    })}
    {evaluations?.quizFinal && <section className="reader-final-evaluation">
      <strong>Évaluation finale</strong>
      <Link
        className={cn("reader-resource-link reader-quiz-link", evaluations.quizFinal.etat === "VERROUILLE" && "disabled", evaluations.quizFinal.id === activeQuizId && "active")}
        aria-current={evaluations.quizFinal.id === activeQuizId ? "page" : undefined}
        aria-disabled={evaluations.quizFinal.etat === "VERROUILLE" || undefined}
        tabIndex={evaluations.quizFinal.etat === "VERROUILLE" ? -1 : undefined}
        href={evaluations.quizFinal.etat === "VERROUILLE" ? "#" : `/apprentissage/${formationId}/quiz?quiz=${evaluations.quizFinal.id}`}
      ><Award aria-hidden="true" size={17}/><span>Quiz final</span><LearningStatusIcon state={evaluations.quizFinal.etat}/></Link>
      <p>{evaluations.evaluationsReussies}/{evaluations.evaluationsObligatoires} évaluations réussies</p>
      {evaluations.certificatDisponible && onDownloadCertificate && <Button size="sm" loading={certificateBusy} onClick={onDownloadCertificate}>Télécharger le certificat</Button>}
    </section>}
  </nav>;
}
