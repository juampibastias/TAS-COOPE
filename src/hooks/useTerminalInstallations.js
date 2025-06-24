import { useEffect, useState, useCallback } from 'react';

export const useTerminalInstallation = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstallSupported, setIsInstallSupported] = useState(false);
    const [terminalId, setTerminalId] = useState(null);
    const [installStep, setInstallStep] = useState('checking');

    // Generar ID único específico para tu proyecto TAS
    const generateTASTerminalId = useCallback(() => {
        const existingId = localStorage.getItem('tas_terminal_id');
        if (existingId) {
            return existingId;
        }

        // Generar fingerprint específico del hardware
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const screenInfo = `${screen.width}x${screen.height}`;
        const platform = navigator.platform.replace(/\s+/g, '');
        const userAgent = navigator.userAgent.slice(-10).replace(/\W/g, '');

        const newId =
            `TAS_${platform}_${screenInfo}_${userAgent}_${random}`.toUpperCase();

        // Guardar configuración completa de la terminal
        const terminalConfig = {
            id: newId,
            installDate: new Date().toISOString(),
            version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height,
                colorDepth: screen.colorDepth,
                orientation: screen.orientation?.type || 'unknown',
            },
            capabilities: {
                touchScreen:
                    'ontouchstart' in window || navigator.maxTouchPoints > 0,
                webSerial: 'serial' in navigator,
                notifications: 'Notification' in window,
                serviceWorker: 'serviceWorker' in navigator,
                fullscreen: 'requestFullscreen' in document.documentElement,
                geolocation: 'geolocation' in navigator,
            },
            location: 'Sin configurar',
            description: 'Terminal TAS COOPE',
            type: 'KIOSK',
        };

        localStorage.setItem('tas_terminal_id', newId);
        localStorage.setItem(
            'tas_terminal_config',
            JSON.stringify(terminalConfig)
        );

        return newId;
    }, []);

    // Verificar si la app está instalada
    const checkInstallStatus = useCallback(() => {
        // Verificar diferentes métodos de instalación
        const isStandalone = window.matchMedia(
            '(display-mode: standalone)'
        ).matches;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInAppBrowser = isIOS && !window.navigator.standalone;
        const isPWAInstalled =
            isStandalone ||
            (isIOS && window.navigator.standalone && !isInAppBrowser);

        return isPWAInstalled;
    }, []);

    // Registrar terminal en tu backend (integrado con tu API existente)
    const registerTerminalWithBackend = useCallback(async (terminalInfo) => {
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!baseUrl) return;

            const response = await fetch(`${baseUrl}/terminalsApi/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_TERMINAL_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                    ...terminalInfo,
                    timestamp: new Date().toISOString(),
                    url: window.location.origin,
                    lastUpdated: new Date().toISOString(),
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Terminal registrada en backend:', result);

                // Actualizar configuración local con datos del servidor
                const localConfig = JSON.parse(
                    localStorage.getItem('tas_terminal_config') || '{}'
                );
                const updatedConfig = {
                    ...localConfig,
                    ...result,
                    serverRegistered: true,
                };
                localStorage.setItem(
                    'tas_terminal_config',
                    JSON.stringify(updatedConfig)
                );

                return result;
            } else {
                console.warn('⚠️ No se pudo registrar terminal en backend');
            }
        } catch (error) {
            console.error('❌ Error registrando terminal:', error);
        }
    }, []);

    useEffect(() => {
        // Verificar estado de instalación
        setIsInstalled(checkInstallStatus());

        // Generar o recuperar ID de terminal
        const id = generateTASTerminalId();
        setTerminalId(id);

        // Determinar step de instalación
        if (checkInstallStatus()) {
            setInstallStep('installed');

            // Registrar en backend si está instalado
            const config = JSON.parse(
                localStorage.getItem('tas_terminal_config') || '{}'
            );
            if (config && !config.serverRegistered) {
                registerTerminalWithBackend(config);
            }
        } else {
            setInstallStep('not-installed');
        }

        // Listener para evento de instalación disponible
        const handleBeforeInstallPrompt = (e) => {
            console.log('💾 PWA instalable detectada para TAS');
            e.preventDefault();
            setInstallPrompt(e);
            setIsInstallSupported(true);
            setInstallStep('installable');
        };

        // Listener para cuando se instala la app
        const handleAppInstalled = () => {
            console.log('✅ TAS PWA instalada exitosamente');
            setInstallPrompt(null);
            setIsInstalled(true);
            setInstallStep('installed');

            // Actualizar configuración con fecha de instalación real
            const config = JSON.parse(
                localStorage.getItem('tas_terminal_config') || '{}'
            );
            config.actualInstallDate = new Date().toISOString();
            config.installMethod = 'PWA';
            localStorage.setItem('tas_terminal_config', JSON.stringify(config));

            // Registrar en backend
            registerTerminalWithBackend(config);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        );
        window.addEventListener('appinstalled', handleAppInstalled);

        // Cleanup
        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            );
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [
        checkInstallStatus,
        generateTASTerminalId,
        registerTerminalWithBackend,
    ]);

    // Función para instalar la app
    const installApp = async () => {
        if (!installPrompt) {
            console.warn('⚠️ No hay prompt de instalación disponible');
            return false;
        }

        try {
            console.log('🚀 Iniciando instalación TAS PWA...');
            installPrompt.prompt();

            const result = await installPrompt.userChoice;
            console.log('📊 Resultado instalación:', result.outcome);

            if (result.outcome === 'accepted') {
                setInstallPrompt(null);
                setInstallStep('installing');
                // El evento 'appinstalled' manejará el resto
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Error durante instalación:', error);
            return false;
        }
    };

    // Obtener información completa de la terminal
    const getTerminalInfo = useCallback(() => {
        const config = JSON.parse(
            localStorage.getItem('tas_terminal_config') || '{}'
        );
        return {
            id: terminalId,
            isInstalled,
            isStandalone: checkInstallStatus(),
            installDate: config.installDate,
            actualInstallDate: config.actualInstallDate,
            version: config.version || process.env.NEXT_PUBLIC_APP_VERSION,
            platform: config.platform,
            screen: config.screen,
            capabilities: config.capabilities,
            type: isInstalled ? 'PWA_INSTALLED' : 'PWA_WEB',
            installMethod: config.installMethod || 'WEB',
            serverRegistered: config.serverRegistered || false,
            location: config.location || 'Sin configurar',
            description: config.description || 'Terminal TAS COOPE',
        };
    }, [terminalId, isInstalled, checkInstallStatus]);

    // Función para configurar la terminal (integrada con tu TerminalProvider)
    const configureTerminal = useCallback(
        (newConfig) => {
            const currentConfig = JSON.parse(
                localStorage.getItem('tas_terminal_config') || '{}'
            );
            const updatedConfig = {
                ...currentConfig,
                ...newConfig,
                lastUpdated: new Date().toISOString(),
            };

            localStorage.setItem(
                'tas_terminal_config',
                JSON.stringify(updatedConfig)
            );

            // Re-registrar en backend con nueva configuración
            registerTerminalWithBackend(updatedConfig);

            return updatedConfig;
        },
        [registerTerminalWithBackend]
    );

    return {
        // Estados principales
        isInstalled,
        isInstallSupported,
        canInstall: !!installPrompt,
        terminalId,
        installStep,

        // Funciones
        installApp,
        getTerminalInfo,
        configureTerminal,

        // Datos adicionales
        installPrompt: !!installPrompt,

        // Integración con tu sistema existente
        isTerminalMode: process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true',
        isKioskMode: process.env.NEXT_PUBLIC_KIOSK_MODE === 'true',
    };
};
