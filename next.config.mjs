/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Para generar archivos estáticos
    trailingSlash: true,
    images: {
        unoptimized: true,
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
            {
                source: '/LOGO.png',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },

    // Remover la configuración experimental que causa el error
    // experimental: {
    //     optimizeCss: true,
    // },
};

export default nextConfig;
