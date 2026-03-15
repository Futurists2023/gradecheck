/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/contractors",
        destination: "/",
        permanent: true,
      },
      {
        source: "/cidb-contractors",
        destination: "/",
        permanent: true,
      },
      {
        source: "/contractors/:province",
        destination: "/cidb-contractors/:province",
        permanent: true,
      },
      {
        source: "/contractors/:province/:city",
        destination: "/cidb-contractors/:province/:city",
        permanent: true,
      },
      {
        source: "/contractors/:province/:city/:grade/:class",
        destination: "/cidb-contractors/:province/:city/:grade/:class",
        permanent: true,
      },
      {
        source: "/contractor/:slug",
        destination: "/cidb-contractor/:slug",
        permanent: true,
      },
      {
        source: "/verify",
        destination: "/verify-cidb-contractor",
        permanent: true,
      },
      {
        source: "/grades",
        destination: "/cidb-grades",
        permanent: true,
      },
      {
        source: "/grades/:grade",
        destination: "/cidb-grades/:grade",
        permanent: true,
      },
      {
        source: "/about",
        destination: "/about-gradecheck",
        permanent: true,
      },
      {
        source: "/about-gradeverify",
        destination: "/about-gradecheck",
        permanent: true,
      },
      {
        source: "/contractors/:province/:city",
        has: [{ type: "query", key: "grade" }],
        destination: "/cidb-contractors/:province/:city",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
