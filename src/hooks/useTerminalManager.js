// src/hooks/useTerminalManager.js - VERSIÓN ACTUALIZADA
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTASService } from '../services/tasTerminalService';
import {
    getTerminalConfig,
    saveTerminalConfig,
    isTerminalConfigured,
} from '../services/deviceIdentifier';

export const useTerminalManager = () => {
    const [terminalConfig, setTerminalConfig] = useState(null);
    const [status, setStatus] = useState('initializing');
    const [isConfigured, setIsConfigured] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [connectionFailures, setConnectionFailures] = useState(0);

    const isInitializedRef = useRef(false);
    const tasServiceRef = useRef(null);

    const TERMINAL_ENABLED =
        process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true';

    useEffect(() => {
        if (!TERMINAL_ENABLED || isInitializedRef.current) return;

        const initializeTerminal = async () => {
            try {
                isInitializedRef.current = true;
                console.log('🔍 Inicializando terminal manager...');

                // Obtener configuración existente
                let config = getTerminalConfig();

                if (config?.id) {
                    setTerminalConfig(config);
                    setIsConfigured(isTerminalConfigured());
                    setStatus('online');

                    // Inicializar TAS Service
                    tasServiceRef.current = getTASService();
                    await tasServiceRef.current.initialize();

                    console.log('✅ Terminal manager inicializado:', config.id);
                } else {
                    setStatus('needs_setup');
                    setShowSetup(true);
                }
            } catch (error) {
                console.error(
                    '❌ Error inicializando terminal manager:',
                    error
                );
                setStatus('error');
            }
        };

        initializeTerminal();

        // Cleanup
        return () => {
            if (tasServiceRef.current) {
                tasServiceRef.current.stop();
            }
        };
    }, [TERMINAL_ENABLED]);

    // Monitorear estado del TAS Service
    useEffect(() => {
        if (!tasServiceRef.current) return;

        const checkServiceStatus = () => {
            const serviceStatus = tasServiceRef.current.getStatus();
            setStatus(serviceStatus.status);
            setConnectionFailures(serviceStatus.connectionFailures);
        };

        const statusInterval = setInterval(checkServiceStatus, 5000);

        return () => clearInterval(statusInterval);
    }, [tasServiceRef.current]);

    const updateConfig = useCallback((newConfig) => {
        setTerminalConfig((prev) => {
            const updated = {
                ...prev,
                ...newConfig,
                updatedAt: new Date().toISOString(),
            };
            saveTerminalConfig(updated);
            setIsConfigured(isTerminalConfigured());
            setShowSetup(false);

            // Reinicializar TAS Service con nueva configuración
            if (tasServiceRef.current) {
                tasServiceRef.current.stop();
                setTimeout(async () => {
                    try {
                        await tasServiceRef.current.initialize();
                    } catch (error) {
                        console.error(
                            'Error reinicializando TAS Service:',
                            error
                        );
                    }
                }, 1000);
            }

            return updated;
        });
    }, []);

    const executeCommand = useCallback(async (command, commandData = null) => {
        if (!tasServiceRef.current) {
            throw new Error('TAS Service no inicializado');
        }

        // Ejecutar comando directamente a través del service
        return await tasServiceRef.current.executeCommand(
            command,
            'manual-' + Date.now(),
            commandData
        );
    }, []);

    const getServiceStatus = useCallback(() => {
        return tasServiceRef.current ? tasServiceRef.current.getStatus() : null;
    }, []);

    return {
        terminalConfig,
        status,
        isConfigured,
        showSetup,
        setShowSetup,
        updateConfig,
        connectionFailures,
        executeCommand,
        getServiceStatus,
        tasService: tasServiceRef.current,
    };
};
