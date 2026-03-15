const launchManifest = require("./generated/launch-index-manifest.json");

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  generateRobotsTxt: true,
  exclude: [
    "/claim/*",
    "/api/*",
    "/about",
    "/verify",
    "/cidb-grade-table",
    "/grades",
    "/grades/*",
    "/contractors",
    "/contractors/*",
    "/contractor/*",
  ],
  transform: async (config, path) => {
    const allowed = new Set(launchManifest.allowed ?? []);
    if (!allowed.has(path)) {
      return null;
    }

    return {
      loc: path,
      changefreq: "daily",
      priority: launchManifest.priorityByPath?.[path] ?? (path === "/" ? 1 : 0.7),
      lastmod: new Date().toISOString(),
    };
  },
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/api/", "/claim/"] },
    ],
  },
};
