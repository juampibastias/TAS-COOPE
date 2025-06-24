import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import TerminalProvider from '../components/TerminalProvider';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'TAS - Terminal de Autoservicio | Cooperativa Popular',
    description:
        'Terminal de Autoservicio para pagos y consultas - Cooperativa Popular de Electricidad',
    keywords: 'terminal, autoservicio, pagos, cooperativa, electricidad',
    robots: 'noindex, nofollow', // Para terminales no indexar
};

export default function RootLayout({ children }) {
    return (
        <html lang='es'>
            <head>
                {/* Meta tags adicionales para terminales */}
                <meta
                    name='viewport'
                    content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
                />
                <meta name='theme-color' content='#00983f' />
                <meta name='apple-mobile-web-app-capable' content='yes' />
                <meta
                    name='apple-mobile-web-app-status-bar-style'
                    content='black-translucent'
                />
                <meta name='mobile-web-app-capable' content='yes' />

                {/* Prevenir zoom y selección en modo kiosco */}
                {process.env.NEXT_PUBLIC_KIOSK_MODE === 'true' && (
                    <>
                        <meta name='format-detection' content='telephone=no' />
                        <meta name='msapplication-tap-highlight' content='no' />
                    </>
                )}

                {/* Favicon para terminales */}
                <link rel='icon' href='/LOGO.png' />
                <link rel='apple-touch-icon' href='/LOGO.png' />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning={true}
            >
                <TerminalProvider>{children}</TerminalProvider>

                {/* Scripts adicionales para terminales */}
                {process.env.NODE_ENV === 'production' && (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                // Prevenir zoom con gestos
                document.addEventListener('touchmove', function(e) {
                  if (e.scale !== 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
                
                // Prevenir zoom con wheel
                document.addEventListener('wheel', function(e) {
                  if (e.ctrlKey) {
                    e.preventDefault();
                  }
                }, { passive: false });
                
                // Log de errores para monitoreo
                window.addEventListener('error', function(e) {
                  console.error('Terminal Error:', e.error);
                });
                
                // Log de errores de promesas
                window.addEventListener('unhandledrejection', function(e) {
                  console.error('Terminal Promise Rejection:', e.reason);
                });
              `,
                        }}
                    />
                )}
            </body>
        </html>
    );
}
