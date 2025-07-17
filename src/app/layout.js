// src/app/layout.js - Layout limpio sin TAS Service ni PWA
import './globals.css';

export const metadata = {
  title: 'TAS COOPE - Terminal de Autoservicio',
  description: 'Terminal de Autoservicio - Cooperativa Popular de Electricidad',
  icons: {
      icon: '/LOGO.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
};

export default function RootLayout({ children }) {
    return (
        <html lang='es'>
            <head>
                <meta name='theme-color' content='#059669' />
                <link rel='icon' href='/LOGO.png' />

                {/* Preload critical resources */}
                <link rel='preload' href='/LOGO.png' as='image' />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}