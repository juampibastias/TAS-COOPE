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
    const registerAttemptedRef = useRef(false);
    const heartbeatIntervalRef = useRef(null);
    const isInitializedRef = useRef(false);
    const heartbeatStartedRef = useRef(false);
    const lastCommandIdRef = useRef(null);

    const TERMINAL_ENABLED =
        process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true';

    useEffect(() => {
        if (!TERMINAL_ENABLED || isInitializedRef.current) return;

        const initializeTerminal = async () => {
            if (initializingRef.current || registerAttemptedRef.current) return;

            initializingRef.current = true;
            isInitializedRef.current = true;
            registerAttemptedRef.current = true;

            try {
                console.log('🔍 Inicializando terminal...');
                let config = getTerminalConfig();

                if (!config?.id) {
                    const deviceId = await generateDeviceFingerprint();
                    config = {
                        id: deviceId,
                        name: `Terminal ${deviceId.substring(
                            deviceId.length - 4
                        )}`,
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
                setStatus('online');

                await registerTerminal(config);
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
            setStatus('online');
            throw error;
        }
    }, []);

    const sendHeartbeat = useCallback(async () => {
        if (!terminalConfig?.id) {
            console.warn(
                '❌ No se encontró terminalConfig.id, abortando heartbeat'
            );
            return;
        }

        try {
            const hardwareInfo = await getHardwareInfo();

            // Normalizamos el estado permitido por el backend
            let heartbeatStatus = ['online', 'offline', 'maintenance'].includes(
                status
            )
                ? status
                : 'maintenance';

            const heartbeatData = {
                status: heartbeatStatus,
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

            const response = await fetch(
                `${BACKEND_URL}/terminalsApi/${terminalConfig.id}/heartbeat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${TERMINAL_TOKEN}`,
                    },
                    body: JSON.stringify(heartbeatData),
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            setLastHeartbeat(new Date());
            setConnectionFailures(0);

            if (data.command && data.commandId !== lastCommandIdRef.current) {
                lastCommandIdRef.current = data.commandId;
                await executeCommand(data.command, data.commandId);
            }

            if (data.config) {
                setTerminalConfig((prev) => {
                    const updated = { ...prev, ...data.config };
                    saveTerminalConfig(updated);
                    return updated;
                });
            }

            if (status === 'offline') {
                setStatus('online');
            }
        } catch (err) {
            console.error('💔 Heartbeat error:', err);
            setConnectionFailures((prev) => {
                const newVal = prev + 1;
                if (newVal >= MAX_FAILURES && status !== 'offline') {
                    setStatus('offline');
                }
                return newVal;
            });
        }
    }, [terminalConfig?.id, status, connectionFailures]);

    useEffect(() => {
        if (
            !TERMINAL_ENABLED ||
            !terminalConfig?.id ||
            status === 'initializing' ||
            status === 'error' ||
            status === 'shutdown'
        )
            return;

        if (heartbeatStartedRef.current) return;

        heartbeatStartedRef.current = true;

        heartbeatIntervalRef.current = setInterval(
            sendHeartbeat,
            HEARTBEAT_INTERVAL
        );
        setTimeout(() => {
            sendHeartbeat();
        }, 500);

        return () => {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
            heartbeatStartedRef.current = false;
        };
    }, [TERMINAL_ENABLED, terminalConfig?.id, status, sendHeartbeat]);

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

    const showRebootScreen = () => {
        document.body.innerHTML = `
            <div style="position: fixed; inset: 0; background: #000; color: white; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
                <div>
                    <h1>Reiniciando Terminal...</h1>
                </div>
            </div>`;
    };

    const showOfflineScreen = () => {
        document.body.innerHTML = `
            <div style="position: fixed; inset: 0; background: #900; color: white; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
                <div>
                    <h1>Sin conexión</h1>
                </div>
            </div>`;
    };

    const updateConfig = useCallback(
        (newConfig) => {
            setTerminalConfig((prev) => {
                const updated = {
                    ...prev,
                    ...newConfig,
                    updatedAt: new Date().toISOString(),
                };
                saveTerminalConfig(updated);
                setIsConfigured(isTerminalConfigured());
                setShowSetup(false);
                registerTerminal(updated).catch(console.error);
                return updated;
            });
        },
        [registerTerminal]
    );

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
