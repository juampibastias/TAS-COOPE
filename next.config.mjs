// Opción 1: Con next-pwa (si funciona)
// import withPWA from 'next-pwa';

// Opción 2: Sin dependencias externas (más simple para empezar)
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Mantener tu configuración actual
    output: 'export', // Para generar archivos estáticos
    trailingSlash: true,
    images: {
        unoptimized: true, // Para terminales sin optimización de imágenes
    },

    // Headers para PWA
    async headers() {
        return [
            {
                source: '/manifest.json',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                    {
                        key: 'Content-Type',
                        value: 'application/manifest+json',
                    },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=0, must-revalidate',
                    },
                    {
                        key: 'Content-Type',
                        value: 'application/javascript',
                    },
                ],
            },
        ];
    },
};

// Si next-pwa funciona, descomenta estas líneas:
/*
  const withPWAConfig = withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
  });
  
  export default withPWAConfig(nextConfig);
  */

// Por ahora, usar configuración simple:
export default nextConfig;
