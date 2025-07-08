// src/app/layout.js - Layout principal con TAS Service
import './globals.css';

export const metadata = {
  title: 'TAS COOPE - Terminal de Autoservicio',
  description: 'Terminal de Autoservicio - Cooperativa Popular de Electricidad',
  manifest: '/manifest.json',
  appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'TAS COOPE',
  },
  icons: {
      icon: '/LOGO.png',
      apple: '/LOGO.png',
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
                <meta name='apple-mobile-web-app-capable' content='yes' />
                <meta
                    name='apple-mobile-web-app-status-bar-style'
                    content='default'
                />
                <meta name='apple-mobile-web-app-title' content='TAS COOPE' />
                <link rel='manifest' href='/manifest.json' />
                <link rel='icon' href='/LOGO.png' />
                <link rel='apple-touch-icon' href='/LOGO.png' />

                {/* Meta tags para PWA */}
                <meta name='mobile-web-app-capable' content='yes' />
                <meta name='application-name' content='TAS COOPE' />

                {/* Preload critical resources */}
                <link rel='preload' href='/LOGO.png' as='image' />
            </head>
            <body>
                {children}

                {/* Script para inicializar TAS Service */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              // Inicializar TAS Service cuando la página esté lista
              if (typeof window !== 'undefined' && '${process.env.NEXT_PUBLIC_TERMINAL_ENABLED}' === 'true') {
                document.addEventListener('DOMContentLoaded', function() {
                  // Importar e inicializar TAS Service
                  import('/src/services/tasTerminalService.js').then(module => {
                    const { getTASService } = module;
                    const tasService = getTASService();
                    tasService.initialize().then(() => {
                      console.log('✅ TAS Service inicializado desde layout');
                    }).catch(error => {
                      console.error('❌ Error inicializando TAS Service desde layout:', error);
                    });
                  }).catch(error => {
                    console.warn('⚠️ No se pudo cargar TAS Service:', error);
                  });
                  
                  // Inicializar atajos de teclado
                  import('/src/services/keyboardShortcuts.js').then(module => {
                    const { getKeyboardShortcuts } = module;
                    getKeyboardShortcuts().initialize();
                  }).catch(error => {
                    console.warn('⚠️ No se pudieron cargar atajos de teclado:', error);
                  });
                });
              }
            `,
                    }}
                />
            </body>
        </html>
    );
}
