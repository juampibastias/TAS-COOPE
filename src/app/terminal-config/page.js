'use client';
import { useState, useEffect } from 'react';
import {
    getTerminalConfig,
    saveTerminalConfig,
    generateDeviceReport,
    getHardwareInfo,
    detectDeviceCapabilities,
} from '../../services/deviceIdentifier';

export default function TerminalConfigPage() {
    const [config, setConfig] = useState(null);
    const [deviceReport, setDeviceReport] = useState(null);
    const [saving, setSaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showPassword, setShowPassword] = useState(true);
    const [password, setPassword] = useState('');

    const CONFIG_PASSWORD = 'config2025';

    useEffect(() => {
        const isAuth = sessionStorage.getItem('config_authenticated');
        if (isAuth === 'true') {
            setShowPassword(false);
            loadConfig();
        }
    }, []);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (password === CONFIG_PASSWORD) {
            sessionStorage.setItem('config_authenticated', 'true');
            setShowPassword(false);
            setPassword('');
            loadConfig();
        } else {
            alert('Contraseña incorrecta');
            setPassword('');
        }
    };

    const loadConfig = async () => {
        try {
            const currentConfig = getTerminalConfig();
            setConfig(
                currentConfig || {
                    id: 'No generado',
                    name: '',
                    location: '',
                    description: '',
                    type: 'KIOSK',
                }
            );

            const report = await generateDeviceReport();
            setDeviceReport(report);
        } catch (error) {
            console.error('Error loading config:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const success = saveTerminalConfig(config);
            if (success) {
                alert('✅ Configuración guardada exitosamente');
                await loadConfig(); // Recargar
            } else {
                alert('❌ Error guardando configuración');
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
        setSaving(false);
    };

    const handleReset = () => {
        if (
            confirm(
                '¿Resetear toda la configuración?\n\nEsto eliminará todos los datos del terminal.'
            )
        ) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    const handleChange = (field, value) => {
        setConfig((prev) => ({ ...prev, [field]: value }));
    };

    const exportConfig = () => {
        const dataStr = JSON.stringify(deviceReport, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `terminal-report-${config?.id || 'unknown'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const sendTestHeartbeat = async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/terminalsApi/${config.id}/heartbeat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_TERMINAL_ACCESS_TOKEN}`,
                    },
                    body: JSON.stringify({
                        status: 'test',
                        timestamp: new Date().toISOString(),
                        version: process.env.NEXT_PUBLIC_APP_VERSION,
                    }),
                }
            );

            if (response.ok) {
                alert('✅ Test de conexión exitoso');
            } else {
                alert('❌ Error en test de conexión: ' + response.status);
            }
        } catch (error) {
            alert('❌ Error de conexión: ' + error.message);
        }
    };

    if (showPassword) {
        return (
            <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
                <div className='bg-white p-8 rounded-lg shadow-xl max-w-md w-full'>
                    <div className='text-center mb-6'>
                        <h1 className='text-2xl font-bold text-gray-900'>
                            Configuración de Terminal
                        </h1>
                        <p className='text-gray-600 mt-2'>Acceso restringido</p>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='Contraseña de configuración'
                            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-4'
                            required
                        />

                        <button
                            type='submit'
                            className='w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700'
                        >
                            Acceder
                        </button>
                    </form>

                    <div className='mt-6 text-center'>
                        <button
                            onClick={() => (window.location.href = '/')}
                            className='text-gray-500 hover:text-gray-700'
                        >
                            ← Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4'></div>
                    <p className='text-gray-600'>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-100'>
            {/* Header */}
            <div className='bg-white shadow-sm border-b'>
                <div className='max-w-4xl mx-auto px-4 py-4'>
                    <div className='flex justify-between items-center'>
                        <div className='flex items-center space-x-4'>
                            <img
                                src='/LOGO.png'
                                alt='Logo'
                                className='h-10 w-auto'
                            />
                            <div>
                                <h1 className='text-2xl font-bold text-gray-900'>
                                    Configuración de Terminal
                                </h1>
                                <p className='text-gray-600'>ID: {config.id}</p>
                            </div>
                        </div>
                        <div className='flex items-center space-x-2'>
                            <button
                                onClick={() => (window.location.href = '/')}
                                className='bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700'
                            >
                                ← Volver
                            </button>
                            <button
                                onClick={() =>
                                    sessionStorage.removeItem(
                                        'config_authenticated'
                                    ) || setShowPassword(true)
                                }
                                className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700'
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className='max-w-4xl mx-auto px-4 py-8'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {/* Configuración básica */}
                    <div className='bg-white rounded-lg shadow p-6'>
                        <h2 className='text-xl font-semibold mb-4'>
                            Información Básica
                        </h2>

                        <div className='space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Nombre del Terminal
                                </label>
                                <input
                                    type='text'
                                    value={config.name || ''}
                                    onChange={(e) =>
                                        handleChange('name', e.target.value)
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500'
                                    placeholder='ej: Terminal Sucursal Centro'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Ubicación
                                </label>
                                <input
                                    type='text'
                                    value={config.location || ''}
                                    onChange={(e) =>
                                        handleChange('location', e.target.value)
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500'
                                    placeholder='ej: Mendoza - Rivadavia'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Tipo de Terminal
                                </label>
                                <select
                                    value={config.type || 'KIOSK'}
                                    onChange={(e) =>
                                        handleChange('type', e.target.value)
                                    }
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500'
                                >
                                    <option value='KIOSK'>
                                        Kiosco de Autoservicio
                                    </option>
                                    <option value='COUNTER'>
                                        Terminal de Mostrador
                                    </option>
                                    <option value='MOBILE'>
                                        Terminal Móvil
                                    </option>
                                    <option value='WALL'>
                                        Terminal de Pared
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-2'>
                                    Descripción
                                </label>
                                <textarea
                                    value={config.description || ''}
                                    onChange={(e) =>
                                        handleChange(
                                            'description',
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500'
                                    placeholder='Descripción adicional...'
                                />
                            </div>
                        </div>

                        <div className='mt-6 flex space-x-3'>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className='flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50'
                            >
                                {saving ? 'Guardando...' : '💾 Guardar'}
                            </button>
                            <button
                                onClick={handleReset}
                                className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700'
                            >
                                🗑️ Reset
                            </button>
                        </div>
                    </div>

                    {/* Información del sistema */}
                    <div className='bg-white rounded-lg shadow p-6'>
                        <h2 className='text-xl font-semibold mb-4'>
                            Estado del Sistema
                        </h2>

                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4 text-sm'>
                                <div>
                                    <span className='text-gray-600'>
                                        ID Terminal:
                                    </span>
                                    <div className='font-mono font-bold'>
                                        {config.id}
                                    </div>
                                </div>
                                <div>
                                    <span className='text-gray-600'>
                                        Versión:
                                    </span>
                                    <div className='font-bold'>
                                        {process.env.NEXT_PUBLIC_APP_VERSION}
                                    </div>
                                </div>
                                <div>
                                    <span className='text-gray-600'>
                                        Modo Terminal:
                                    </span>
                                    <div className='font-bold'>
                                        {process.env
                                            .NEXT_PUBLIC_TERMINAL_ENABLED ===
                                        'true'
                                            ? '✅ Activo'
                                            : '❌ Inactivo'}
                                    </div>
                                </div>
                                <div>
                                    <span className='text-gray-600'>
                                        Modo Kiosco:
                                    </span>
                                    <div className='font-bold'>
                                        {process.env.NEXT_PUBLIC_KIOSK_MODE ===
                                        'true'
                                            ? '✅ Activo'
                                            : '❌ Inactivo'}
                                    </div>
                                </div>
                            </div>

                            <div className='border-t pt-4'>
                                <button
                                    onClick={sendTestHeartbeat}
                                    className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-2'
                                >
                                    🔍 Test de Conexión
                                </button>

                                <button
                                    onClick={exportConfig}
                                    className='w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700'
                                >
                                    📁 Exportar Reporte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información avanzada */}
                <div className='mt-8 bg-white rounded-lg shadow p-6'>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className='w-full flex items-center justify-between p-2 text-left'
                    >
                        <h2 className='text-xl font-semibold'>
                            Información Técnica
                        </h2>
                        <span
                            className={`transform transition-transform ${
                                showAdvanced ? 'rotate-180' : ''
                            }`}
                        >
                            ▼
                        </span>
                    </button>

                    {showAdvanced && deviceReport && (
                        <div className='mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6'>
                            {/* Hardware */}
                            <div>
                                <h3 className='font-semibold mb-2'>Hardware</h3>
                                <div className='bg-gray-50 p-3 rounded text-sm space-y-1'>
                                    <div>
                                        Pantalla:{' '}
                                        {deviceReport.hardware?.screen?.width}x
                                        {deviceReport.hardware?.screen?.height}
                                    </div>
                                    <div>
                                        Plataforma:{' '}
                                        {
                                            deviceReport.hardware?.navigator
                                                ?.platform
                                        }
                                    </div>
                                    <div>
                                        CPU Cores:{' '}
                                        {deviceReport.hardware?.navigator
                                            ?.hardwareConcurrency || 'N/A'}
                                    </div>
                                    <div>
                                        Touch Points:{' '}
                                        {deviceReport.hardware?.navigator
                                            ?.maxTouchPoints || 0}
                                    </div>
                                    <div>
                                        Idioma:{' '}
                                        {
                                            deviceReport.hardware?.navigator
                                                ?.language
                                        }
                                    </div>
                                    <div>
                                        Online:{' '}
                                        {deviceReport.hardware?.navigator
                                            ?.onLine
                                            ? '✅'
                                            : '❌'}
                                    </div>
                                </div>
                            </div>

                            {/* Capacidades */}
                            <div>
                                <h3 className='font-semibold mb-2'>
                                    Capacidades
                                </h3>
                                <div className='bg-gray-50 p-3 rounded text-sm'>
                                    <div className='grid grid-cols-2 gap-1'>
                                        {deviceReport.capabilities &&
                                            Object.entries(
                                                deviceReport.capabilities
                                            ).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className={`${
                                                        value
                                                            ? 'text-green-600'
                                                            : 'text-red-500'
                                                    }`}
                                                >
                                                    {value ? '✓' : '✗'} {key}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Variables de entorno */}
                            <div className='lg:col-span-2'>
                                <h3 className='font-semibold mb-2'>
                                    Configuración de Entorno
                                </h3>
                                <div className='bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto'>
                                    <div>
                                        BACKEND_URL:{' '}
                                        {process.env.NEXT_PUBLIC_BACKEND_URL}
                                    </div>
                                    <div>
                                        TERMINAL_ENABLED:{' '}
                                        {
                                            process.env
                                                .NEXT_PUBLIC_TERMINAL_ENABLED
                                        }
                                    </div>
                                    <div>
                                        KIOSK_MODE:{' '}
                                        {process.env.NEXT_PUBLIC_KIOSK_MODE}
                                    </div>
                                    <div>
                                        FULLSCREEN_MODE:{' '}
                                        {
                                            process.env
                                                .NEXT_PUBLIC_FULLSCREEN_MODE
                                        }
                                    </div>
                                    <div>
                                        MODO_ENABLED:{' '}
                                        {process.env.NEXT_PUBLIC_MODO_ENABLED}
                                    </div>
                                    <div>
                                        MERCADOPAGO_ENABLED:{' '}
                                        {
                                            process.env
                                                .NEXT_PUBLIC_MERCADOPAGO_ENABLED
                                        }
                                    </div>
                                    <div>
                                        PRINTER_ENABLED:{' '}
                                        {
                                            process.env
                                                .NEXT_PUBLIC_PRINTER_ENABLED
                                        }
                                    </div>
                                    <div>
                                        HEARTBEAT_INTERVAL:{' '}
                                        {
                                            process.env
                                                .NEXT_PUBLIC_HEARTBEAT_INTERVAL
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* Logs recientes */}
                            <div className='lg:col-span-2'>
                                <h3 className='font-semibold mb-2'>
                                    Información del Navegador
                                </h3>
                                <div className='bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto'>
                                    <div>User Agent: {navigator.userAgent}</div>
                                    <div>Vendor: {navigator.vendor}</div>
                                    <div>
                                        Cookie Enabled:{' '}
                                        {navigator.cookieEnabled ? '✅' : '❌'}
                                    </div>
                                    <div>
                                        Do Not Track:{' '}
                                        {navigator.doNotTrack ||
                                            'No especificado'}
                                    </div>
                                    <div>
                                        Timezone:{' '}
                                        {
                                            Intl.DateTimeFormat().resolvedOptions()
                                                .timeZone
                                        }
                                    </div>
                                    <div>
                                        Timestamp: {new Date().toISOString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Atajos de teclado */}
                <div className='mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4'>
                    <h3 className='font-semibold text-blue-800 mb-2'>
                        Atajos de Teclado
                    </h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700'>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>
                                Ctrl+Alt+Shift+C
                            </kbd>{' '}
                            Abrir configuración
                        </div>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>
                                Ctrl+Alt+Shift+R
                            </kbd>{' '}
                            Reset terminal
                        </div>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>
                                Ctrl+Alt+Shift+I
                            </kbd>{' '}
                            Info en consola
                        </div>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>F11</kbd>{' '}
                            Pantalla completa
                        </div>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>
                                Ctrl+Alt+F
                            </kbd>{' '}
                            Toggle fullscreen
                        </div>
                        <div>
                            <kbd className='bg-blue-200 px-1 rounded'>
                                Ctrl+Alt+Shift+F
                            </kbd>{' '}
                            Controles fullscreen
                        </div>
                    </div>
                </div>

                {/* Footer con información de acceso */}
                <div className='mt-8 text-center text-gray-500 text-sm'>
                    <p>
                        Para acceder a esta configuración externamente, visite:
                    </p>
                    <code className='bg-gray-100 px-2 py-1 rounded'>
                        {window.location.origin}/terminal-config
                    </code>
                </div>
            </div>
        </div>
    );
}
