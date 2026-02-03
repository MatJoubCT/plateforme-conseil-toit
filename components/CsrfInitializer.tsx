'use client';

import { useEffect } from 'react';

/**
 * Composant pour initialiser le token CSRF au chargement de l'application
 * Ce token est nécessaire pour toutes les mutations API (POST, PUT, DELETE)
 * Stocke le token dans sessionStorage comme fallback si les cookies sont bloqués
 */
export default function CsrfInitializer() {
  useEffect(() => {
    // Appeler l'endpoint pour obtenir et définir le token CSRF dans les cookies
    fetch('/api/csrf-token')
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          // Stocker aussi le token dans sessionStorage comme backup
          sessionStorage.setItem('csrf-token', data.token);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur lors de l\'initialisation du token CSRF:', error);
        }
      });
  }, []);

  // Ce composant ne rend rien
  return null;
}
