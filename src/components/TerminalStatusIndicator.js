// src/components/TerminalStatusIndicator.js
'use client';

import { useState, useEffect } from 'react';
import { getTASService } from '../services/tasTerminalService';

export default function TerminalStatusIndicator() {
    const [status, setStatus] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Solo mostrar en modo terminal
        if (process.env.NEXT_PUBLIC_TERMINAL_ENABLED !== 'true') {
            return;
        }

        let statusInterval;

        const updateStatus = () => {
            try {
                const tasService = getTASService();
                const currentStatus = tasService.getStatus();
                setStatus(currentStatus);
                setIsVisible(true);
            } catch (error) {
                console.warn('Error obteniendo estado TAS:', error);
            }
        };

        // Actualizar inmediatamente y luego cada 5 segundos
        updateStatus();
        statusInterval = setInterval(updateStatus, 5000);

        return () => {
            if (statusInterval) clearInterval(statusInterval);
        };
    }, []);

    // Determinar color y estado visual
    const getStatusConfig = (status) => {
        if (!status) return { color: 'gray', text: 'Desconocido', icon: '❓' };

        switch (status.status) {
            case 'online':
                return {
                    color: 'green',
                    text: 'En línea',
                    icon: '🟢',
                    bgColor: 'rgba(34, 197, 94, 0.1)',
                    borderColor: '#22c55e',
                };
            case 'offline':
                return {
                    color: 'red',
                    text: 'Sin conexión',
                    icon: '🔴',
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444',
                };
            case 'maintenance':
                return {
                    color: 'orange',
                    text: 'Mantenimiento',
                    icon: '🔧',
                    bgColor: 'rgba(249, 115, 22, 0.1)',
                    borderColor: '#f97316',
                };
            case 'error':
                return {
                    color: 'red',
                    text: 'Error',
                    icon: '⚠️',
                    bgColor: 'rgba(239, 68, 68, 0.1)',
                    borderColor: '#ef4444',
                };
            case 'shutdown':
                return {
                    color: 'gray',
                    text: 'Apagado',
                    icon: '⚡',
                    bgColor: 'rgba(107, 114, 128, 0.1)',
                    borderColor: '#6b7280',
                };
            default:
                return {
                    color: 'blue',
                    text: status.status,
                    icon: '🔵',
                    bgColor: 'rgba(59, 130, 246, 0.1)',
                    borderColor: '#3b82f6',
                };
        }
    };

    if (!isVisible || !status) return null;

    const statusConfig = getStatusConfig(status);

    // Mostrar solo en desarrollo o si hay problemas
    const shouldShow =
        process.env.NODE_ENV === 'development' ||
        status.status !== 'online' ||
        status.connectionFailures > 0;

    if (!shouldShow) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                zIndex: 9999,
                background: statusConfig.bgColor,
                border: `2px solid ${statusConfig.borderColor}`,
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(10px)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: '0.875rem',
                color: '#1f2937',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>
                        {statusConfig.icon}
                    </span>
                    <span style={{ fontWeight: '600' }}>
                        {statusConfig.text}
                    </span>
                </div>

                {status.connectionFailures > 0 && (
                    <span
                        style={{
                            background: '#fbbf24',
                            color: '#92400e',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                        }}
                    >
                        {status.connectionFailures} fallos
                    </span>
                )}
            </div>

            <div
                style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    opacity: 0.8,
                }}
            >
                <span>ID: {status.terminalId?.slice(-8) || 'N/A'}</span>
                <span>{status.isHeartbeatActive ? '💓' : '💔'}</span>
            </div>

            {/* Información adicional en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
                <div
                    style={{
                        marginTop: '0.5rem',
                        fontSize: '0.7rem',
                        opacity: 0.7,
                        fontFamily: 'monospace',
                    }}
                >
                    <div>Registrado: {status.isRegistered ? '✅' : '❌'}</div>
                    <div>
                        Heartbeat: {status.isHeartbeatActive ? '✅' : '❌'}
                    </div>
                </div>
            )}
        </div>
    );
}
