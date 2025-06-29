import { useEffect, useState, useCallback } from 'react';

export const useTerminalInstallation = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [terminalId, setTerminalId] = useState(null);
    const [installStep, setInstallStep] = useState('checking');

    const checkInstallStatus = useCallback(() => {
        if (typeof window === 'undefined') return false;
        const isStandalone = window.matchMedia(
            '(display-mode: standalone)'
        ).matches;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isIOSStandalone = isIOS && window.navigator.standalone;
        return isStandalone || isIOSStandalone;
    }, []);

    const generateTerminalId = useCallback(() => {
        if (typeof window === 'undefined') return null;

        const existingId = localStorage.getItem('tas_terminal_id');
        if (existingId) return existingId;

        const random = Math.random().toString(36).slice(2, 8);
        const screenInfo = `${screen.width}x${screen.height}`;
        const platform = navigator.platform.replace(/\s+/g, '');
        const newId = `TAS_${platform}_${screenInfo}_${random}`.toUpperCase();

        const terminalConfig = {
            id: newId,
            installDate: new Date().toISOString(),
            platform: navigator.platform,
            screen: { width: screen.width, height: screen.height },
            version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
            type: 'KIOSK',
        };

        localStorage.setItem('tas_terminal_id', newId);
        localStorage.setItem(
            'tas_terminal_config',
            JSON.stringify(terminalConfig)
        );

        return newId;
    }, []);

    const registerServiceWorker = useCallback(async () => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator))
            return null;

        try {
            const registration = await navigator.serviceWorker.register(
                '/sw.js'
            );
            console.log('✅ Service Worker registrado');
            return registration;
        } catch (error) {
            console.error('❌ Error registrando Service Worker:', error);
            return null;
        }
    }, []);

    const registerTerminalWithBackend = useCallback(async (terminalInfo) => {
        if (typeof window === 'undefined') return;

        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) return;

        try {
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
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Terminal registrada en backend');

                const localConfig = JSON.parse(
                    localStorage.getItem('tas_terminal_config') || '{}'
                );
                localConfig.serverRegistered = true;
                localStorage.setItem(
                    'tas_terminal_config',
                    JSON.stringify(localConfig)
                );
                return result;
            }
        } catch (error) {
            console.error('❌ Error registrando terminal:', error);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const initializePWA = async () => {
            console.log('🚀 Inicializando PWA...');
            await registerServiceWorker();
            setIsInstalled(checkInstallStatus());

            const id = generateTerminalId();
            setTerminalId(id);

            if (checkInstallStatus()) {
                setInstallStep('installed');
                const config = JSON.parse(
                    localStorage.getItem('tas_terminal_config') || '{}'
                );
                if (!config.serverRegistered) {
                    registerTerminalWithBackend(config);
                }
            } else {
                setInstallStep('not-installed');
            }
        };

        initializePWA();
    }, [
        checkInstallStatus,
        generateTerminalId,
        registerServiceWorker,
        registerTerminalWithBackend,
    ]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBeforeInstallPrompt = (e) => {
            console.log('💾 PWA instalable detectada');
            e.preventDefault();
            setInstallPrompt(e);
            setInstallStep('installable');
        };

        const handleAppInstalled = () => {
            console.log('✅ PWA instalada');
            setInstallPrompt(null);
            setIsInstalled(true);
            setInstallStep('installed');

            const config = JSON.parse(
                localStorage.getItem('tas_terminal_config') || '{}'
            );
            config.actualInstallDate = new Date().toISOString();
            config.installMethod = 'PWA';
            localStorage.setItem('tas_terminal_config', JSON.stringify(config));
            registerTerminalWithBackend(config);
        };

        const handleDisplayModeChange = () => {
            const newStatus = checkInstallStatus();
            setIsInstalled(newStatus);
            setInstallStep(newStatus ? 'installed' : 'not-installed');
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleBeforeInstallPrompt
        );
        window.addEventListener('appinstalled', handleAppInstalled);
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener('change', handleDisplayModeChange);

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleBeforeInstallPrompt
            );
            window.removeEventListener('appinstalled', handleAppInstalled);
            mediaQuery.removeEventListener('change', handleDisplayModeChange);
        };
    }, [checkInstallStatus, registerTerminalWithBackend]);

    const installApp = async () => {
        if (!installPrompt || typeof installPrompt.prompt !== 'function') {
            console.warn('⚠️ No se puede instalar la app: prompt inválido');
            return false;
        }

        try {
            console.log('🚀 Iniciando instalación...');
            await installPrompt.prompt();
            const result = await installPrompt.userChoice;

            console.log('📊 Resultado:', result.outcome);
            if (result.outcome === 'accepted') {
                setInstallPrompt(null);
                setInstallStep('installing');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error durante instalación:', error);
            return false;
        }
    };

    const getTerminalInfo = useCallback(() => {
        if (typeof window === 'undefined') return {};
        const config = JSON.parse(
            localStorage.getItem('tas_terminal_config') || '{}'
        );
        return {
            id: terminalId,
            isInstalled,
            installDate: config.installDate,
            platform: config.platform,
            screen: config.screen,
            version: config.version,
            type: isInstalled ? 'PWA_INSTALLED' : 'PWA_WEB',
            serverRegistered: config.serverRegistered || false,
        };
    }, [terminalId, isInstalled]);

    return {
        isInstalled,
        canInstall: !!installPrompt,
        terminalId,
        installStep,
        installApp,
        getTerminalInfo,
        isTerminalMode: process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true',
        isKioskMode: process.env.NEXT_PUBLIC_KIOSK_MODE === 'true',
    };
};
