import type {MetadataRoute} from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/catalogue", "/orientation", "/formateurs"],
      disallow: ["/admin/", "/formateur/", "/participant/", "/profile", "/notifications", "/apprentissage/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
