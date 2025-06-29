'use client';

import { useState, useEffect } from 'react';
import {
    validateTerminalConfig,
    detectDeviceCapabilities,
    getHardwareInfo,
} from '../services/deviceIdentifier';

export default function TerminalSetup({
    show,
    onClose,
    currentConfig,
    onSave,
}) {
    const [config, setConfig] = useState({
        id: '',
        name: '',
        location: '',
        description: '',
        type: 'KIOSK',
        ...currentConfig,
    });

    const [errors, setErrors] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [deviceInfo, setDeviceInfo] = useState(null);

    useEffect(() => {
        if (show && currentConfig) {
            setConfig((prev) => ({ ...prev, ...currentConfig }));
            loadDeviceInfo();
        }
    }, [show, currentConfig]);

    const loadDeviceInfo = async () => {
        try {
            const hardware = await getHardwareInfo();
            const capabilities = detectDeviceCapabilities();
            setDeviceInfo({ hardware, capabilities });
        } catch (error) {
            console.error('Error loading device info:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const validation = validateTerminalConfig(config);
        if (!validation.isValid) {
            setErrors(validation.errors);
            setSaving(false);
            return;
        }

        try {
            await onSave(config);
            setErrors([]);
        } catch (error) {
            setErrors(['Error guardando configuración: ' + error.message]);
        }

        setSaving(false);
    };

    const handleChange = (field, value) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
        setErrors([]);
    };

    const resetConfig = () => {
        if (confirm('¿Resetear toda la configuración?')) {
            setConfig({
                id: currentConfig?.id || '',
                name: '',
                location: '',
                description: '',
                type: 'KIOSK',
            });
            setErrors([]);
        }
    };

    if (!show) return null;

    return (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
            <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
                {/* Header */}
                <div className='bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg'>
                    <div className='flex justify-between items-center'>
                        <div>
                            <h2 className='text-2xl font-bold'>
                                Configuración de Terminal
                            </h2>
                            <p className='text-green-100 mt-1'>
                                Configure los datos de identificación del
                                terminal
                            </p>
                        </div>
                        <div className='text-right text-sm'>
                            <div>ID: {config.id}</div>
                            <div>
                                Versión: {process.env.NEXT_PUBLIC_APP_VERSION}
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className='p-6'>
                    {/* Errores */}
                    {errors.length > 0 && (
                        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
                            <h3 className='text-red-800 font-semibold mb-2'>
                                Errores de validación:
                            </h3>
                            <ul className='text-red-700 text-sm space-y-1'>
                                {errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Configuración básica */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Nombre del Terminal *
                            </label>
                            <input
                                type='text'
                                value={config.name}
                                onChange={(e) =>
                                    handleChange('name', e.target.value)
                                }
                                placeholder='ej: Terminal Sucursal Centro'
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Ubicación *
                            </label>
                            <input
                                type='text'
                                value={config.location}
                                onChange={(e) =>
                                    handleChange('location', e.target.value)
                                }
                                placeholder='ej: Mendoza - Rivadavia'
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                                required
                            />
                        </div>

                        <div className='md:col-span-2'>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Descripción
                            </label>
                            <textarea
                                value={config.description}
                                onChange={(e) =>
                                    handleChange('description', e.target.value)
                                }
                                placeholder='Descripción adicional del terminal...'
                                rows={3}
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                Tipo de Terminal
                            </label>
                            <select
                                value={config.type}
                                onChange={(e) =>
                                    handleChange('type', e.target.value)
                                }
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                            >
                                <option value='KIOSK'>
                                    Kiosco de Autoservicio
                                </option>
                                <option value='COUNTER'>
                                    Terminal de Mostrador
                                </option>
                                <option value='MOBILE'>Terminal Móvil</option>
                                <option value='WALL'>Terminal de Pared</option>
                            </select>
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>
                                ID del Terminal
                            </label>
                            <input
                                type='text'
                                value={config.id}
                                readOnly
                                className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm'
                            />
                            <p className='text-xs text-gray-500 mt-1'>
                                ID generado automáticamente (solo lectura)
                            </p>
                        </div>
                    </div>

                    {/* Información del dispositivo */}
                    <div className='mb-6'>
                        <button
                            type='button'
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className='flex items-center text-sm text-gray-600 hover:text-gray-800'
                        >
                            <span
                                className={`mr-2 transition-transform ${
                                    showAdvanced ? 'rotate-90' : ''
                                }`}
                            >
                                ▶
                            </span>
                            Información del Dispositivo
                        </button>

                        {showAdvanced && deviceInfo && (
                            <div className='mt-4 bg-gray-50 rounded-lg p-4'>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                                    <div>
                                        <h4 className='font-semibold text-gray-700 mb-2'>
                                            Hardware
                                        </h4>
                                        <div className='space-y-1 text-gray-600'>
                                            <div>
                                                Pantalla:{' '}
                                                {
                                                    deviceInfo.hardware.screen
                                                        .width
                                                }
                                                x
                                                {
                                                    deviceInfo.hardware.screen
                                                        .height
                                                }
                                            </div>
                                            <div>
                                                Plataforma:{' '}
                                                {
                                                    deviceInfo.hardware
                                                        .navigator.platform
                                                }
                                            </div>
                                            <div>
                                                CPU Cores:{' '}
                                                {deviceInfo.hardware.navigator
                                                    .hardwareConcurrency ||
                                                    'N/A'}
                                            </div>
                                            <div>
                                                Touch Points:{' '}
                                                {deviceInfo.hardware.navigator
                                                    .maxTouchPoints || 0}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className='font-semibold text-gray-700 mb-2'>
                                            Capacidades
                                        </h4>
                                        <div className='grid grid-cols-2 gap-1 text-xs'>
                                            {Object.entries(
                                                deviceInfo.capabilities
                                            ).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className={
                                                        value
                                                            ? 'text-green-600'
                                                            : 'text-red-500'
                                                    }
                                                >
                                                    {value ? '✓' : '✗'} {key}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botones */}
                    <div className='flex justify-between'>
                        <button
                            type='button'
                            onClick={resetConfig}
                            className='px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50'
                        >
                            Resetear
                        </button>

                        <div className='space-x-3'>
                            <button
                                type='button'
                                onClick={onClose}
                                disabled={saving}
                                className='px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50'
                            >
                                Cancelar
                            </button>
                            <button
                                type='submit'
                                disabled={saving}
                                className='px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center'
                            >
                                {saving && (
                                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                                )}
                                {saving
                                    ? 'Guardando...'
                                    : 'Guardar Configuración'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Footer con atajos */}
                <div className='bg-gray-50 px-6 py-3 rounded-b-lg border-t'>
                    <div className='text-xs text-gray-500 text-center'>
                        <div className='mb-1'>Atajos de teclado:</div>
                        <div className='space-x-4'>
                            <span>
                                <kbd className='bg-gray-200 px-1 rounded'>
                                    Ctrl+Alt+Shift+C
                                </kbd>{' '}
                                Configuración
                            </span>
                            <span>
                                <kbd className='bg-gray-200 px-1 rounded'>
                                    Ctrl+Alt+Shift+R
                                </kbd>{' '}
                                Reset
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
