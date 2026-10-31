import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL || "https://questedge.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/jobs",
          "/contact",
          "/privacy-policy",
          "/terms-of-service",
          "/cookie-policy",
          "/gdpr",
        ],
        disallow: [
          "/admin/",
          "/dashboard/",
          "/recruiter/",
          "/candidate/",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

