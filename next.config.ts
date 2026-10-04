import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 * - Les images privées sont servies par l'application elle-même (ou via URL signée S3).
 * - Les tuiles de carte, affiches de films et pochettes Spotify viennent de domaines connus.
 * - Next.js injecte des scripts inline : 'unsafe-inline' reste nécessaire sans nonce.
 */
function contentSecurityPolicy() {
  const storageOrigin = process.env.STORAGE_PUBLIC_ORIGIN ?? "";
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://image.tmdb.org",
      "https://i.scdn.co",
      "https://*.spotifycdn.com",
      "https://mosaic.scdn.co",
      "https://image-cdn-ak.spotifycdn.com",
      "https://*.cartocdn.com",
      "https://*.basemaps.cartocdn.com",
      "https://api.maptiler.com",
      ...(storageOrigin ? [storageOrigin] : []),
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://*.basemaps.cartocdn.com",
      "https://basemaps.cartocdn.com",
      "https://tiles.basemaps.cartocdn.com",
      "https://api.maptiler.com",
      "https://tiles.openfreemap.org",
      ...(storageOrigin ? [storageOrigin] : []),
      ...(isDev ? ["ws:", "wss:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "frame-src": ["https://open.spotify.com"],
    "media-src": ["'self'", "blob:", "https://p.scdn.co"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  reactStrictMode: true,
  // sharp et les binaires natifs restent hors du bundle serveur.
  serverExternalPackages: ["sharp", "@node-rs/argon2", "archiver"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
