// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
    //output: 'export', // Para generar archivos estáticos
    trailingSlash: true,
    images: {
        unoptimized: true, // Para terminales sin optimización de imágenes
    },
};

export default nextConfig; 
