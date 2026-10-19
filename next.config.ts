import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  output: "standalone",
  async redirects() {
    return [
      { source: "/admin", destination: "/app", permanent: false },
      { source: "/admin/recruitment", destination: "/app/employees/applicants", permanent: false },
      { source: "/our-pricing", destination: "/pricing", permanent: true },
      { source: "/our-projects", destination: "/before-after", permanent: true },
      { source: "/services/commercial", destination: "/commercial", permanent: true },
      {
        source: "/services/commercial/property-management-maintenance",
        destination: "/property-management",
        permanent: true,
      },
      {
        source: "/services/furniture-assembly-in-chicago",
        destination: "/services/furniture-assembly",
        permanent: true,
      },
      {
        source: "/services/tv-mounting-in-chicago",
        destination: "/services/tv-mounting",
        permanent: true,
      },
      {
        source: "/services/door-repair-in-chicago",
        destination: "/services/door-window-repairs",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
      {
        source: "/estimate/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};
export default config;
