import type {MetadataRoute} from "next";

type Catalogue = {content: {id: number}[]};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
  const staticPages: MetadataRoute.Sitemap = [
    {url: site, changeFrequency: "weekly", priority: 1},
    {url: `${site}/catalogue`, changeFrequency: "daily", priority: .9},
    {url: `${site}/orientation`, changeFrequency: "monthly", priority: .8},
  ];
  try {
    const response = await fetch(`${api}/catalogue?page=0&size=50`, {next: {revalidate: 3600}});
    if (!response.ok) return staticPages;
    const data = await response.json() as Catalogue;
    return [...staticPages, ...data.content.map((course) => ({
      url: `${site}/catalogue/${course.id}`,
      changeFrequency: "weekly" as const,
      priority: .8,
    }))];
  } catch {
    return staticPages;
  }
}
