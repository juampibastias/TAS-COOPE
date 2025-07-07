/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  basePath: isProd ? '/tas-coope' : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
    async headers() {
      return [
        {
          source: '/manifest.json',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
            { key: 'Content-Type', value: 'application/manifest+json' },
          ],
        },
        {
          source: '/sw.js',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
            { key: 'Content-Type', value: 'application/javascript' },
          ],
        },
        {
          source: '/LOGO.png',
          headers: [
            { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          ],
        },
      ];
    },
  };
  
  export default nextConfig;
  