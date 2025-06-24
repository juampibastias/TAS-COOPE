'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    generateDeviceFingerprint,
    getTerminalConfig,
    saveTerminalConfig,
    isTerminalConfigured,
    getHardwareInfo,
} from '../services/deviceIdentifier';

const TERMINAL_TOKEN = process.env.NEXT_PUBLIC_TERMINAL_ACCESS_TOKEN;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const HEARTBEAT_INTERVAL =
    parseInt(process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL) || 30000;
const MAX_FAILURES =
    parseInt(process.env.NEXT_PUBLIC_TERMINAL_MAX_FAILURES) || 6;

export const useTerminalManager = () => {
    const [terminalConfig, setTerminalConfig] = useState(null);
    const [status, setStatus] = useState('initializing');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState(null);
    const [connectionFailures, setConnectionFailures] = useState(0);

    const initializingRef = useRef(false);
    const heartbeatIntervalRef = useRef(null);
    const isInitializedRef = useRef(false);
    const heartbeatStartedRef = useRef(false);
    const lastCommandIdRef = useRef(null);

    const TERMINAL_ENABLED =
        process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true';

    // Inicialización del terminal
    useEffect(() => {
        if (!TERMINAL_ENABLED || isInitializedRef.current) return;

        const initializeTerminal = async () => {
            if (initializingRef.current) return;
            initializingRef.current = true;
            isInitializedRef.current = true;

            try {
                console.log('🔍 Inicializando terminal...');
                let config = getTerminalConfig();

                // Si no hay configuración, generar una nueva
                if (!config?.id) {
                    const deviceId = await generateDeviceFingerprint();
                    config = {
                        id: deviceId,
                        name: `Terminal ${deviceId.substring(-4)}`,
                        location: 'Sin configurar',
                        url: window.location.origin,
                        type: 'KIOSK',
                        description: '',
                        createdAt: new Date().toISOString(),
                    };
                    saveTerminalConfig(config);
                }

                setTerminalConfig(config);
                setIsConfigured(isTerminalConfigured());
                setStatus('connecting');

                // Registrar terminal en el backend
                await registerTerminal(config);
                setStatus('online');
                setConnectionFailures(0);

                console.log('✅ Terminal inicializado:', config.id);
            } catch (error) {
                console.error('❌ Error inicializando terminal:', error);
                setStatus('error');
                setConnectionFailures((prev) => prev + 1);
            }
        };

        initializeTerminal();
    }, []);

    // Registro del terminal en el backend
    const registerTerminal = useCallback(async (config) => {
        if (!TERMINAL_ENABLED) return;

        try {
            const hardwareInfo = await getHardwareInfo();

            const registrationData = {
                ...config,
                version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                hardware: hardwareInfo,
                capabilities: {
                    payment: true,
                    printing:
                        process.env.NEXT_PUBLIC_PRINTER_ENABLED === 'true',
                    modo: process.env.NEXT_PUBLIC_MODO_ENABLED === 'true',
                    mercadopago:
                        process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true',
                    fullscreen: 'requestFullscreen' in document.documentElement,
                    touchscreen: 'ontouchstart' in window,
                },
                url: window.location.origin,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
            };

            const response = await fetch(
                `${BACKEND_URL}/terminalsApi/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${TERMINAL_TOKEN}`,
                    },
                    body: JSON.stringify(registrationData),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const result = await response.json();
            console.log('✅ Terminal registrado:', result);

            return result;
        } catch (error) {
            console.error('❌ Error en registro:', error);
            setStatus('connection_error');
            throw error;
        }
    }, []);

    // Sistema de heartbeat
    useEffect(() => {
        if (
            !TERMINAL_ENABLED ||
            !terminalConfig?.id ||
            status === 'initializing' ||
            status === 'error' ||
            status === 'shutdown'
        ) {
            return;
        }

        if (heartbeatStartedRef.current) {
            return;
        }

        heartbeatStartedRef.current = true;
        console.log('💓 Iniciando heartbeat para:', terminalConfig.id);

        const sendHeartbeat = async () => {
            try {
                const hardwareInfo = await getHardwareInfo();

                const heartbeatData = {
                    status,
                    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                    timestamp: new Date().toISOString(),
                    hardware: hardwareInfo,
                    failures: connectionFailures,
                    uptime:
                        Date.now() -
                        (terminalConfig.createdAt
                            ? new Date(terminalConfig.createdAt).getTime()
                            : Date.now()),
                    currentUrl: window.location.href,
                };

                /* const response = await fetch(
                    `${BACKEND_URL}/terminalsApi/${terminalConfig.id}/heartbeat`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${TERMINAL_TOKEN}`,
                        },
                        body: JSON.stringify(heartbeatData),
                    }
                ); */

                if (!response.ok) {
                    throw new Error(
                        `HTTP ${response.status}: ${response.statusText}`
                    );
                }

                const data = await response.json();
                setLastHeartbeat(new Date());
                setConnectionFailures(0);

                // Procesar comandos recibidos
                if (
                    data.command &&
                    data.commandId !== lastCommandIdRef.current
                ) {
                    console.log('📨 Comando recibido:', data.command);
                    lastCommandIdRef.current = data.commandId;
                    await executeCommand(data.command, data.commandId);
                }

                // Actualizar configuración si viene del servidor
                if (data.config) {
                    setTerminalConfig((prev) => {
                        const updatedConfig = { ...prev, ...data.config };
                        saveTerminalConfig(updatedConfig);
                        return updatedConfig;
                    });
                }

                if (status === 'connection_error') {
                    setStatus('online');
                }
            } catch (error) {
                console.error('💔 Error en heartbeat:', error);
                setConnectionFailures((prev) => {
                    const newFailures = prev + 1;

                    if (newFailures >= MAX_FAILURES) {
                        setStatus('connection_error');
                    }

                    return newFailures;
                });
            }
        };

        // Enviar heartbeat inmediatamente
        sendHeartbeat();

        // Configurar intervalo
        heartbeatIntervalRef.current = setInterval(
            sendHeartbeat,
            HEARTBEAT_INTERVAL
        );

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
            heartbeatStartedRef.current = false;
        };
    }, [TERMINAL_ENABLED, terminalConfig?.id, status, connectionFailures]);

    // Ejecución de comandos remotos
    const executeCommand = useCallback(
        async (command, commandId) => {
            let success = true;
            let errorMessage = null;
            let result = null;

            try {
                console.log(`🎮 Ejecutando comando: ${command}`);

                switch (command) {
                    case 'reboot':
                        setStatus('rebooting');
                        showRebootScreen();
                        setTimeout(() => {
                            window.location.reload(true);
                        }, 5000);
                        break;

                    case 'maintenance':
                        setStatus('maintenance');
                        break;

                    case 'online':
                        setStatus('online');
                        break;

                    case 'shutdown':
                        setStatus('shutdown');
                        break;

                    case 'hard_refresh':
                        // Limpiar caches y datos
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            await Promise.all(
                                cacheNames.map((name) => caches.delete(name))
                            );
                        }
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href =
                            window.location.href + '?t=' + Date.now();
                        break;

                    case 'force_reload':
                        window.location.replace(window.location.href);
                        break;

                    case 'clear_storage':
                        localStorage.clear();
                        sessionStorage.clear();
                        if ('indexedDB' in window) {
                            try {
                                indexedDB.deleteDatabase('default');
                            } catch (e) {
                                console.warn('No se pudo limpiar IndexedDB');
                            }
                        }
                        setTimeout(() => window.location.reload(true), 1000);
                        break;

                    case 'offline_mode':
                        setStatus('offline');
                        showOfflineScreen();
                        break;

                    case 'get_info':
                        result = {
                            config: terminalConfig,
                            hardware: await getHardwareInfo(),
                            status,
                            failures: connectionFailures,
                            lastHeartbeat,
                            uptime:
                                Date.now() -
                                (terminalConfig.createdAt
                                    ? new Date(
                                          terminalConfig.createdAt
                                      ).getTime()
                                    : Date.now()),
                        };
                        break;

                    case 'show_setup':
                        setShowSetup(true);
                        break;

                    case 'toggle_fullscreen':
                        if (document.fullscreenElement) {
                            await document.exitFullscreen();
                        } else {
                            await document.documentElement.requestFullscreen();
                        }
                        break;

                    default:
                        throw new Error(`Comando desconocido: ${command}`);
                }

                console.log(`✅ Comando ${command} ejecutado exitosamente`);
            } catch (error) {
                success = false;
                errorMessage = error.message;
                console.error(`❌ Error ejecutando comando ${command}:`, error);
            }

            // Confirmar ejecución del comando al servidor
            if (
                TERMINAL_ENABLED &&
                command !== 'force_reload' &&
                command !== 'hard_refresh'
            ) {
                try {
                    await fetch(
                        `${BACKEND_URL}/terminalsApi/${terminalConfig?.id}/command-executed`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${TERMINAL_TOKEN}`,
                            },
                            body: JSON.stringify({
                                commandId,
                                command,
                                success,
                                error_message: errorMessage,
                                result,
                                timestamp: new Date().toISOString(),
                            }),
                        }
                    );
                } catch (error) {
                    console.error('❌ Error confirmando comando:', error);
                }
            }
        },
        [terminalConfig?.id, status, connectionFailures, lastHeartbeat]
    );

    // Pantallas de estado
    const showRebootScreen = () => {
        document.body.innerHTML = `
            <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif; 
                color: white; text-align: center; z-index: 9999;">
                <div>
                    <div style="font-size: 4rem; margin-bottom: 2rem; animation: spin 2s linear infinite;">🔄</div>
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">Reiniciando Terminal</h1>
                    <p style="font-size: 1.5rem; margin-bottom: 2rem;">Por favor espere...</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 10px; margin: 0 auto; max-width: 400px;">
                        <p style="margin: 0;"><strong>Terminal ID:</strong> ${terminalConfig?.id}</p>
                        <p style="margin: 0.5rem 0 0 0;"><strong>Tiempo estimado:</strong> 10-30 segundos</p>
                    </div>
                </div>
                <style>
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </div>
        `;
    };

    const showOfflineScreen = () => {
        document.body.innerHTML = `
            <div style="position: fixed; inset: 0; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
                display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif; 
                color: white; text-align: center; z-index: 9999;">
                <div>
                    <div style="font-size: 4rem; margin-bottom: 2rem;">📡❌</div>
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">Sin Conexión</h1>
                    <p style="font-size: 1.5rem; margin-bottom: 2rem;">
                        La terminal ha perdido conexión con el servidor.<br>
                        Contacte al personal técnico.
                    </p>
                    <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 10px; margin: 0 auto; max-width: 400px;">
                        <p style="margin: 0;"><strong>Terminal ID:</strong> ${
                            terminalConfig?.id
                        }</p>
                        <p style="margin: 0.5rem 0 0 0;"><strong>Última conexión:</strong> ${new Date().toLocaleString()}</p>
                        <p style="margin: 0.5rem 0 0 0;"><strong>Fallos:</strong> ${connectionFailures}/${MAX_FAILURES}</p>
                    </div>
                </div>
            </div>
        `;
    };

    // Actualizar configuración
    const updateConfig = useCallback(
        (newConfig) => {
            setTerminalConfig((prev) => {
                const updatedConfig = {
                    ...prev,
                    ...newConfig,
                    updatedAt: new Date().toISOString(),
                };
                saveTerminalConfig(updatedConfig);
                setIsConfigured(isTerminalConfigured());
                setShowSetup(false);

                // Re-registrar con nueva configuración
                registerTerminal(updatedConfig).catch(console.error);

                return updatedConfig;
            });
        },
        [registerTerminal]
    );

    // Atajos de teclado globales
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+Alt+Shift+C - Mostrar configuración
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                setShowSetup(true);
            }

            // Ctrl+Alt+Shift+R - Reset terminal
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                if (
                    confirm(
                        '🚨 ¿RESETEAR TERMINAL?\n\nEsto borrará todos los datos y reiniciará la terminal.'
                    )
                ) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                }
            }

            // Ctrl+Alt+Shift+I - Mostrar información
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                console.log('📊 Información del terminal:', {
                    config: terminalConfig,
                    status,
                    failures: connectionFailures,
                    lastHeartbeat,
                    isConfigured,
                });
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [
        terminalConfig,
        status,
        connectionFailures,
        lastHeartbeat,
        isConfigured,
    ]);

    return {
        terminalConfig,
        status,
        isConfigured,
        showSetup,
        setShowSetup,
        updateConfig,
        lastHeartbeat,
        connectionFailures,
        maxFailures: MAX_FAILURES,
        executeCommand,
    };
};
