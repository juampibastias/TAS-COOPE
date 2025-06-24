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
    title: 'TAS COOPE - Terminal de Autoservicio',
    description:
        'Terminal de Autoservicio para pagos y consultas - Cooperativa Popular de Electricidad',
    keywords:
        'terminal, autoservicio, pagos, cooperativa, electricidad, TAS, COOPE',
    robots: 'noindex, nofollow', // Para terminales no indexar

    // 🆕 Metadatos específicos para PWA
    applicationName: 'TAS COOPE',
    authors: [{ name: 'Cooperativa Popular' }],
    generator: 'Next.js',

    // 🆕 Open Graph para mejor integración
    openGraph: {
        title: 'TAS COOPE - Terminal de Autoservicio',
        description: 'Terminal de autoservicio para pagos de electricidad',
        siteName: 'TAS COOPE',
        locale: 'es_AR',
        type: 'website',
    },

    // 🆕 PWA específico
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'TAS COOPE',
        startupImage: [
            {
                url: '/LOGO.png',
                media: '(device-width: 768px) and (device-height: 1024px)',
            },
        ],
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang='es'>
            <head>
                {/* Meta tags adicionales para terminales PWA */}
                <meta
                    name='viewport'
                    content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
                />
                <meta name='theme-color' content='#00983f' />
                <meta name='apple-mobile-web-app-capable' content='yes' />
                <meta
                    name='apple-mobile-web-app-status-bar-style'
                    content='black-translucent'
                />
                <meta name='apple-mobile-web-app-title' content='TAS COOPE' />
                <meta name='mobile-web-app-capable' content='yes' />

                {/* 🆕 PWA Icons */}
                <link rel='icon' href='/LOGO.png' />
                <link rel='apple-touch-icon' href='/LOGO.png' />
                <link rel='apple-touch-icon' sizes='180x180' href='/LOGO.png' />
                <link rel='mask-icon' href='/LOGO.png' color='#00983f' />

                {/* 🆕 Windows Tiles */}
                <meta name='msapplication-TileColor' content='#00983f' />
                <meta name='msapplication-TileImage' content='/LOGO.png' />
                <meta
                    name='msapplication-config'
                    content='/browserconfig.xml'
                />

                {/* Prevenir zoom y selección en modo kiosco */}
                {process.env.NEXT_PUBLIC_KIOSK_MODE === 'true' && (
                    <>
                        <meta name='format-detection' content='telephone=no' />
                        <meta name='msapplication-tap-highlight' content='no' />
                        <style
                            dangerouslySetInnerHTML={{
                                __html: `
                                * {
                                    -webkit-user-select: none;
                                    -moz-user-select: none;
                                    -ms-user-select: none;
                                    user-select: none;
                                    -webkit-touch-callout: none;
                                    -webkit-tap-highlight-color: transparent;
                                }
                                input, textarea {
                                    -webkit-user-select: text;
                                    -moz-user-select: text;
                                    -ms-user-select: text;
                                    user-select: text;
                                }
                            `,
                            }}
                        />
                    </>
                )}
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning={true}
            >
                <TerminalProvider>{children}</TerminalProvider>

                {/* 🆕 Scripts adicionales para terminales PWA */}
                {process.env.NODE_ENV === 'production' && (
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                // 🆕 Prevenir zoom con gestos
                document.addEventListener('touchmove', function(e) {
                  if (e.scale !== 1) {
                    e.preventDefault();
                  }
                }, { passive: false });
                
                // 🆕 Prevenir zoom con wheel
                document.addEventListener('wheel', function(e) {
                  if (e.ctrlKey) {
                    e.preventDefault();
                  }
                }, { passive: false });
                
                // 🆕 Log de errores para monitoreo
                window.addEventListener('error', function(e) {
                  console.error('Terminal Error:', e.error);
                  
                  // Enviar error al backend si está configurado
                  if (window.TERMINAL_CONFIG?.sendErrors) {
                    fetch('/api/terminal-error', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        error: e.error.message,
                        stack: e.error.stack,
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        terminalId: localStorage.getItem('tas_terminal_id')
                      })
                    }).catch(() => {});
                  }
                });
                
                // 🆕 Log de errores de promesas
                window.addEventListener('unhandledrejection', function(e) {
                  console.error('Terminal Promise Rejection:', e.reason);
                });
                
                // 🆕 PWA específico - detectar instalación
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  deferredPrompt = e;
                  console.log('💾 PWA instalable detectada');
                });
                
                window.addEventListener('appinstalled', () => {
                  console.log('✅ PWA instalada exitosamente');
                  deferredPrompt = null;
                });
                
                // 🆕 Configuración global de terminal
                window.TERMINAL_CONFIG = {
                  version: '${process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}',
                  terminalMode: ${
                      process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true'
                  },
                  kioskMode: ${process.env.NEXT_PUBLIC_KIOSK_MODE === 'true'},
                  fullscreenMode: ${
                      process.env.NEXT_PUBLIC_FULLSCREEN_MODE === 'true'
                  },
                  sendErrors: true
                };
                
                // 🆕 Atajos de teclado para administración
                document.addEventListener('keydown', function(e) {
                  // Ctrl+Alt+Shift+C - Configuración
                  if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    window.location.href = '/terminal-config';
                  }
                  
                  // Ctrl+Alt+Shift+I - Info en consola
                  if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'I') {
                    e.preventDefault();
                    const terminalInfo = {
                      id: localStorage.getItem('tas_terminal_id'),
                      config: JSON.parse(localStorage.getItem('tas_terminal_config') || '{}'),
                      isPWA: window.matchMedia('(display-mode: standalone)').matches,
                      version: window.TERMINAL_CONFIG.version,
                      userAgent: navigator.userAgent,
                      timestamp: new Date().toISOString()
                    };
                    console.log('📊 Terminal Info:', terminalInfo);
                  }
                  
                  // Ctrl+Alt+F - Toggle fullscreen
                  if (e.ctrlKey && e.altKey && e.key === 'f') {
                    e.preventDefault();
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      document.documentElement.requestFullscreen();
                    }
                  }
                });
              `,
                        }}
                    />
                )}
            </body>
        </html>
    );
}
