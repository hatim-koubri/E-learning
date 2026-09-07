"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowRight, BookOpen, Layers3, UserRound, UsersRound} from "lucide-react";
import {useEffect, useRef, type PointerEvent} from "react";
import type {CatalogueItem} from "@/lib/learning";
import {Badge} from "@/components/ui";
import {FavoriteButton} from "@/components/FavoriteButton";

export function levelLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function CourseCard({course}: {course: CatalogueItem}) {
  const cardRef = useRef<HTMLElement>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => () => {
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  function updateTilt(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const rotateY = ((event.clientX - rect.left) / rect.width - .5) * 2.4;
    const rotateX = -((event.clientY - rect.top) / rect.height - .5) * 2.4;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      card.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
    });
  }

  function resetTilt() {
    const card = cardRef.current;
    if (!card) return;
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame(() => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  }

  return (
    <article className={`course-card ${course.inscrit?"enrolled":""}`} ref={cardRef} onPointerMove={updateTilt} onPointerLeave={resetTilt}>
      <Link className="course-media" href={`/catalogue/${course.id}`} aria-label={`Voir ${course.titre}`}>
        {course.imageUrl ? (
          <Image
            unoptimized
            width={560}
            height={315}
            sizes="(max-width: 700px) calc(100vw - 28px), (max-width: 1100px) calc(50vw - 30px), 380px"
            src={course.imageUrl}
            alt=""
          />
        ) : (
          <span><BookOpen aria-hidden="true" size={34} /></span>
        )}
        <span className="course-media-badges"><Badge variant="primary">{levelLabel(course.niveau)}</Badge>{course.inscrit&&<Badge variant="success">Déjà acquise</Badge>}</span>
      </Link>
      <div className="course-card-body">
        <span className="course-category">{course.categorie}</span>
        <h2><Link href={`/catalogue/${course.id}`}>{course.titre}</Link></h2>
        <p>{course.description}</p>
        <div className="course-meta">
          <span><UserRound size={15} />{course.formateur}</span>
          <span><Layers3 size={15} />{course.nombreModules} modules</span>
          {course.classeActive
            ? <span><UsersRound size={15} /> Classe active {course.supplementClasses > 0 ? `· +${course.supplementClasses} DH` : "· incluse"}</span>
            : <span><BookOpen size={15} /> {course.offreClasses ? "Autonome · option classes" : "Accès autonome"}</span>}
        </div>
        <div className="course-card-footer">
          <strong>{course.prix === 0 ? "Gratuite" : `${course.prix} DH`}</strong>
          <FavoriteButton formationId={course.id} compact />
          <Link className="text-link" href={course.inscrit?`/apprentissage/${course.id}`:`/catalogue/${course.id}`}>{course.inscrit?"Continuer":"Découvrir"} <ArrowRight size={16} /></Link>
        </div>
      </div>
    </article>
  );
}
