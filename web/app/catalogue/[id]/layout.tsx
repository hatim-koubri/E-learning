import type {Metadata} from "next";

type Course = {titre: string; description: string; imageUrl?: string};

export async function generateMetadata({params}: {params: Promise<{id: string}>}): Promise<Metadata> {
  const {id} = await params;
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
  try {
    const response = await fetch(`${api}/catalogue/${id}`, {next: {revalidate: 900}});
    if (!response.ok) return {title: "Formation"};
    const course = await response.json() as Course;
    const description = course.description.slice(0, 155);
    return {
      title: course.titre,
      description,
      alternates: {canonical: `/catalogue/${id}`},
      openGraph: {
        type: "website",
        title: course.titre,
        description,
        images: course.imageUrl ? [{url: course.imageUrl}] : undefined,
      },
    };
  } catch {
    return {title: "Formation"};
  }
}

export default function CourseLayout({children}: {children: React.ReactNode}) {
  return children;
}
