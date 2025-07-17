/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    basePath: isProd ? '/tas-coope' : '',
    trailingSlash: true,
    assetPrefix: isProd ? '/tas-coope' : '',
    images: {
        unoptimized: true,
    },
    async headers() {
        return [
            {
                source: '/LOGO.png',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
            {
                source: '/QR-COOPE.gif',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                ],
            },
        ];
    },
};

export default nextConfig;