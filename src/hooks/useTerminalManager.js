'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    generateDeviceFingerprint,
    getTerminalConfig,
    saveTerminalConfig,
} from '../services/deviceIdentifier';

export const useTerminalManager = () => {
    const [terminalConfig, setTerminalConfig] = useState(null);
    const [status, setStatus] = useState('initializing');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    // 🔥 CRÍTICO: Refs para evitar loops infinitos
    const initializingRef = useRef(false);
    const heartbeatIntervalRef = useRef(null);
    const isInitializedRef = useRef(false);

    // ✅ Inicializar terminal - SOLO UNA VEZ
    useEffect(() => {
        if (isInitializedRef.current) return;

        const initializeTerminal = async () => {
            if (initializingRef.current) return;
            initializingRef.current = true;
            isInitializedRef.current = true;

            try {
                console.log('🔍 Initializing terminal...');
                console.log(
                    '🔍 Backend URL:',
                    process.env.NEXT_PUBLIC_BACKEND_URL
                );

                let config = getTerminalConfig();

                if (!config?.id) {
                    console.log('🆔 Generating device fingerprint...');
                    const deviceId = await generateDeviceFingerprint();
                    config = {
                        id: deviceId,
                        name: `Terminal ${deviceId.substring(-4)}`,
                        location: 'Sin configurar',
                        url: window.location.origin,
                    };
                    saveTerminalConfig(config);
                }

                console.log('📱 Terminal config:', config);
                setTerminalConfig(config);
                setIsConfigured(
                    !!config.name &&
                        config.name !== `Terminal ${config.id.substring(-4)}`
                );
                setStatus('connecting');

                // Registrar en backend
                await registerTerminal(config);
                setStatus('online');
            } catch (error) {
                console.error('❌ Error initializing terminal:', error);
                setStatus('error');
            }
        };

        initializeTerminal();
    }, []); // 🔥 Sin dependencias - solo ejecuta una vez

    // ✅ Función de registro estable
    const registerTerminal = useCallback(async (config) => {
        try {
            console.log('📡 Registering terminal:', config.id);

            if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
                throw new Error('NEXT_PUBLIC_BACKEND_URL no está configurado');
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/terminals/register`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...config,
                        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`
                );
            }

            const result = await response.json();
            console.log('✅ Terminal registered:', result);
        } catch (error) {
            console.error('❌ Registration error:', error);
            setStatus('connection_error');
        }
    }, []); // Sin dependencias - función estable

    // ✅ Heartbeat - SEPARADO del initialization
    useEffect(() => {
        // Solo iniciar si hay config y no está en estados problemáticos
        if (
            !terminalConfig?.id ||
            status === 'initializing' ||
            status === 'error'
        ) {
            return;
        }

        // Limpiar intervalo anterior si existe
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
        }

        console.log('💓 Starting heartbeat for:', terminalConfig.id);

        const sendHeartbeat = async () => {
            try {
                console.log('💓 Sending heartbeat to:', terminalConfig.id);

                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/terminals/${terminalConfig.id}/heartbeat`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: status,
                            version:
                                process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                            timestamp: new Date().toISOString(),
                        }),
                    }
                );

                const data = await response.json();

                if (data.command) {
                    console.log('📨 Received command:', data.command);
                    await executeCommand(data.command, data.commandId);
                }

                // Actualizar status si estaba en error
                if (status === 'connection_error') {
                    setStatus('online');
                }
            } catch (error) {
                console.error('💔 Heartbeat error:', error);
                setStatus('connection_error');
            }
        };

        // Primer heartbeat inmediato
        sendHeartbeat();

        // Configurar intervalo
        heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
        };
    }, [terminalConfig?.id]); // 🔥 Solo depende del ID, no del status

    // En useTerminalManager.js - AGREGAR DETECTOR DE CONEXIÓN
    useEffect(() => {
        let consecutiveFailures = 0;

        const detectConnection = async () => {
            try {
                await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/ping', {
                    method: 'HEAD',
                    cache: 'no-cache',
                    timeout: 5000,
                });
                consecutiveFailures = 0; // Reset contador
            } catch (error) {
                consecutiveFailures++;
                console.warn(
                    `⚠️ Fallo de conectividad ${consecutiveFailures}/3`
                );

                if (consecutiveFailures >= 3) {
                    console.error(
                        '❌ CONEXIÓN PERDIDA - Mostrando pantalla offline'
                    );
                    setStatus('offline');
                    showOfflineScreen();
                }
            }
        };

        // Verificar conectividad cada 30 segundos
        const connectionCheck = setInterval(detectConnection, 30000);

        // Verificar inmediatamente
        detectConnection();

        return () => clearInterval(connectionCheck);
    }, []);

    // ✅ Función de comando estable con NUEVOS COMANDOS DE EMERGENCIA
    // En useTerminalManager.js - COMANDOS MEJORADOS
    const executeCommand = useCallback(
        async (command, commandId) => {
            let success = true;
            let errorMessage = null;

            try {
                console.log('⚡ Executing command:', command);

                switch (command) {
                    case 'reboot':
                        setStatus('rebooting');
                        // Mostrar pantalla de reinicio
                        showRebootScreen();
                        setTimeout(() => {
                            window.location.reload(true); // Forzar recarga desde servidor
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

                    // 🆕 COMANDOS DE RECUPERACIÓN WEB
                    case 'hard_refresh':
                        console.log(
                            '🔄 HARD REFRESH - Limpiando cache y recargando'
                        );
                        // Limpiar todo el cache del navegador
                        if ('caches' in window) {
                            caches.keys().then((names) => {
                                names.forEach((name) => caches.delete(name));
                            });
                        }
                        localStorage.clear();
                        sessionStorage.clear();
                        // Forzar recarga bypass cache
                        window.location.href =
                            window.location.href + '?t=' + Date.now();
                        break;

                    case 'force_reload':
                        console.log('💀 FORCE RELOAD - Recarga forzada');
                        // Múltiples métodos de recarga forzada
                        window.location.replace(window.location.href);
                        break;

                    case 'clear_storage':
                        console.log('🧹 CLEAR STORAGE - Limpiando datos');
                        localStorage.clear();
                        sessionStorage.clear();
                        indexedDB.deleteDatabase('default'); // Si usan IndexedDB
                        setTimeout(() => {
                            window.location.reload(true);
                        }, 1000);
                        break;

                    case 'network_check':
                        console.log(
                            '🌐 NETWORK CHECK - Verificando conectividad'
                        );
                        await checkNetworkConnectivity();
                        break;

                    // 🆕 PANTALLA DE SIN CONEXIÓN
                    case 'offline_mode':
                        setStatus('offline');
                        showOfflineScreen();
                        break;

                    default:
                        throw new Error(`Comando desconocido: ${command}`);
                }
            } catch (error) {
                success = false;
                errorMessage = error.message;
                console.error('❌ Command execution error:', error);
            }

            // Confirmar ejecución
            if (command !== 'force_reload' && command !== 'hard_refresh') {
                try {
                    await fetch(
                        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/terminals/${terminalConfig?.id}/command-executed`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                commandId,
                                success,
                                error_message: errorMessage,
                            }),
                        }
                    );
                } catch (error) {
                    console.error('❌ Error confirming command:', error);
                }
            }
        },
        [terminalConfig?.id]
    );

    // 🆕 FUNCIONES AUXILIARES
    const showRebootScreen = () => {
        document.body.innerHTML = `
      <div style="
        position: fixed; inset: 0; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex; align-items: center; justify-content: center;
        font-family: Arial, sans-serif; color: white; text-align: center;
      ">
        <div>
          <div style="font-size: 4rem; margin-bottom: 2rem;">🔄</div>
          <h1 style="font-size: 3rem; margin-bottom: 1rem;">Reiniciando Terminal</h1>
          <p style="font-size: 1.5rem;">Por favor espere...</p>
          <div style="margin-top: 2rem;">
            <div style="
              width: 60px; height: 60px; border: 6px solid rgba(255,255,255,0.3);
              border-top: 6px solid white; border-radius: 50%;
              animation: spin 1s linear infinite; margin: 0 auto;
            "></div>
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
      <div style="
        position: fixed; inset: 0; 
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
        display: flex; align-items: center; justify-content: center;
        font-family: Arial, sans-serif; color: white; text-align: center;
      ">
        <div>
          <div style="font-size: 4rem; margin-bottom: 2rem;">📡❌</div>
          <h1 style="font-size: 3rem; margin-bottom: 1rem;">Sin Conexión a Internet</h1>
          <p style="font-size: 1.5rem; margin-bottom: 2rem;">
            La terminal ha perdido conexión con el servidor.<br>
            Contacte al personal técnico.
          </p>
          <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 10px;">
            <p><strong>Terminal ID:</strong> ${terminalConfig?.id}</p>
            <p><strong>Última conexión:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;
    };

    const checkNetworkConnectivity = async () => {
        try {
            await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + '/api/ping', {
                method: 'HEAD',
                cache: 'no-cache',
            });
            console.log('✅ Conectividad OK');
            setStatus('online');
        } catch (error) {
            console.log('❌ Sin conectividad');
            setStatus('offline');
            showOfflineScreen();
        }
    };

    // ✅ Función de actualización estable
    const updateConfig = useCallback((newConfig) => {
        setTerminalConfig((prev) => {
            const updatedConfig = { ...prev, ...newConfig };
            saveTerminalConfig(updatedConfig);
            setIsConfigured(true);
            setShowSetup(false);
            return updatedConfig;
        });
    }, []);

    // ✅ Atajo secreto para configuración manual
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+Alt+Shift+C para configuración
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'C') {
                setShowSetup(true);
            }

            // 🆕 Ctrl+Alt+Shift+R para reset de emergencia local
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'R') {
                console.log('🚨 RESET DE EMERGENCIA LOCAL');
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
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []); // Sin dependencias

    return {
        terminalConfig,
        status,
        isConfigured,
        showSetup,
        setShowSetup,
        updateConfig,
    };
};
