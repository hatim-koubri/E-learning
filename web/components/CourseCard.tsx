import Image from "next/image";
import Link from "next/link";
import {ArrowRight, BookOpen, Layers3, UserRound} from "lucide-react";
import type {CatalogueItem} from "@/lib/learning";
import {Badge} from "@/components/ui";

export function levelLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function CourseCard({course}: {course: CatalogueItem}) {
  return (
    <article className="course-card">
      <Link className="course-media" href={`/catalogue/${course.id}`} aria-label={`Voir ${course.titre}`}>
        {course.imageUrl ? (
          <Image unoptimized width={560} height={315} src={course.imageUrl} alt="" />
        ) : (
          <span><BookOpen aria-hidden="true" size={34} /></span>
        )}
        <Badge variant="primary">{levelLabel(course.niveau)}</Badge>
      </Link>
      <div className="course-card-body">
        <span className="course-category">{course.categorie}</span>
        <h2><Link href={`/catalogue/${course.id}`}>{course.titre}</Link></h2>
        <p>{course.description}</p>
        <div className="course-meta">
          <span><UserRound size={15} />{course.formateur}</span>
          <span><Layers3 size={15} />{course.nombreModules} modules</span>
        </div>
        <div className="course-card-footer">
          <strong>{course.prix === 0 ? "Gratuite" : `${course.prix} DH`}</strong>
          <Link className="text-link" href={`/catalogue/${course.id}`}>Découvrir <ArrowRight size={16} /></Link>
        </div>
      </div>
    </article>
  );
}
