import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * En-têtes de sécurité HTTP
   * Protège contre XSS, clickjacking, MIME-sniffing, etc.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Protège contre le clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Protège contre le MIME-type sniffing
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block', // Protection XSS pour les anciens navigateurs
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Contrôle des informations referrer
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Désactive les APIs sensibles
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com", // Scripts autorisés (Google Maps requiert unsafe-eval)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Styles autorisés
              "font-src 'self' https://fonts.gstatic.com", // Polices autorisées
              "img-src 'self' data: https: blob:", // Images autorisées
              "connect-src 'self' https://*.supabase.co https://maps.googleapis.com", // Connexions autorisées (Supabase, Google Maps)
              "frame-src 'none'", // Pas d'iframes
              "object-src 'none'", // Pas d'objets/embeds
              "base-uri 'self'", // Empêche l'injection de base href
              "form-action 'self'", // Les formulaires ne peuvent soumettre qu'à notre domaine
              "upgrade-insecure-requests", // Force HTTPS
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains', // Force HTTPS pendant 1 an
          },
        ],
      },
    ];
  },
};

export default nextConfig;
