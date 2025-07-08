// src/app/page.js - VERSIÓN COMPLETA con TAS Service
'use client';
import { useState, useEffect } from 'react';
import { useTerminalInstallation } from '../hooks/useTerminalInstallation';
import TerminalStatusIndicator from '../components/TerminalStatusIndicator';

export default function TASHomeScreen() {
    const [modoSuspendido, setModoSuspendido] = useState(true);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    // Hook PWA existente
    const {
        isInstalled,
        canInstall,
        terminalId,
        installStep,
        installApp,
        getTerminalInfo,
        isTerminalMode,
    } = useTerminalInstallation();

    // Inicializar TAS Service
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true') {
            const initTASService = async () => {
                try {
                    const { getTASService } = await import(
                        '../services/tasTerminalService'
                    );
                    const tasService = getTASService();
                    await tasService.initialize();
                    console.log(
                        '✅ TAS Service inicializado en página principal'
                    );
                } catch (error) {
                    console.error('❌ Error inicializando TAS Service:', error);
                }
            };

            // Inicializar después de un breve delay para asegurar que el DOM esté listo
            setTimeout(initTASService, 1000);
        }
    }, []);

    // ⏱ Inactividad -> suspensión (5 minutos)
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                setModoSuspendido(true);
            }, 5 * 60 * 1000);
        };

        const handleUserInteraction = () => {
            if (modoSuspendido) {
                setModoSuspendido(false);
                setMostrarBienvenida(true);
            }
            resetInactividad();
        };

        window.addEventListener('mousedown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);

        resetInactividad();

        return () => {
            window.removeEventListener('mousedown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            clearTimeout(inactividadTimer);
        };
    }, [modoSuspendido]);

    // Timer para ocultar bienvenida
    useEffect(() => {
        if (mostrarBienvenida) {
            const timer = setTimeout(() => {
                setMostrarBienvenida(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [mostrarBienvenida]);

    // Navegación
    const irAPagarFactura = () => {
        window.location.href = '/login-nis';
    };

    const irAImprimirFormularios = () => {
        window.location.href = '/imprimir-formularios';
    };

    // Función para instalar PWA
    const handleInstallPWA = async () => {
        const success = await installApp();
        if (success) {
            setMostrarBienvenida(true);
        }
    };

    // Pantalla suspendida
    if (modoSuspendido) {
        return (
            <>
                <TerminalStatusIndicator />
                <div className='fixed inset-0 bg-black flex items-center justify-center z-50'>
                    <img
                        src='/QR-COOPE.gif'
                        alt='Pantalla suspendida'
                        className='w-full h-full object-cover'
                    />
                    {isInstalled && terminalId && (
                        <div className='absolute bottom-4 right-4 bg-black bg-opacity-70 text-green-400 px-3 py-2 rounded-lg text-sm font-mono'>
                            Terminal: {terminalId.slice(-8)}
                        </div>
                    )}
                </div>
            </>
        );
    }

    // Pantalla de bienvenida
    if (mostrarBienvenida) {
        return (
            <>
                <TerminalStatusIndicator />
                <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 flex items-center justify-center'>
                    <div className='text-center text-white animate-pulse'>
                        <div className='mb-6'>
                            <div className='w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6'>
                                <img
                                    src='/LOGO.png'
                                    alt='Logo Cooperativa'
                                    className='w-full h-full object-contain'
                                />
                            </div>
                        </div>
                        <h1 className='text-5xl font-bold mb-4'>BIENVENIDO</h1>
                        <p className='text-2xl mb-2'>
                            Terminal de Autoservicio
                        </p>
                        <p className='text-lg text-green-200'>
                            Cooperativa Popular
                        </p>

                        {isInstalled && terminalId && (
                            <div className='mt-4 bg-green-800 bg-opacity-50 rounded-lg p-3'>
                                <p className='text-sm text-green-200'>
                                    ✅ Terminal PWA Configurada
                                </p>
                                <p className='text-xs text-green-300 font-mono'>
                                    ID: {terminalId.slice(-12)}
                                </p>
                            </div>
                        )}

                        <div className='mt-8'>
                            <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-white'></div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Pantalla principal
    return (
        <>
            <TerminalStatusIndicator />
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
                {/* HEADER */}
                <div className='bg-gradient-to-r from-green-800 to-lime-600 p-6 shadow-2xl'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4'>
                            <img
                                src='/LOGO.png'
                                alt='Logo Cooperativa'
                                className='h-16 w-auto object-contain'
                            />
                            {isTerminalMode && (
                                <div className='flex flex-col text-xs'>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            isInstalled
                                                ? 'bg-green-600 text-white'
                                                : 'bg-orange-600 text-white'
                                        }`}
                                    >
                                        {isInstalled ? '📱 PWA' : '🌐 WEB'}
                                    </span>
                                    {terminalId && (
                                        <span className='text-green-200 font-mono text-[10px] mt-1'>
                                            {terminalId.slice(-8)}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className='text-center'>
                            <h1 className='text-3xl font-bold'>
                                TERMINAL DE AUTOSERVICIO
                            </h1>
                            <p className='text-green-100 text-lg'>
                                Cooperativa Popular de Electricidad
                            </p>
                        </div>
                        <div className='text-right text-sm text-green-100'>
                            <div className='text-lg font-semibold'>
                                {new Date().toLocaleDateString('es-AR', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                            <div className='text-lg'>
                                {new Date().toLocaleTimeString('es-AR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>
                            {canInstall && (
                                <button
                                    onClick={handleInstallPWA}
                                    className='mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors animate-pulse'
                                    title='Instalar como aplicación'
                                >
                                    📱 INSTALAR
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className='flex-1 flex items-center justify-center p-8'>
                    <div className='max-w-6xl w-full'>
                        {/* Mensaje de bienvenida */}
                        <div className='text-center mb-12'>
                            <h2 className='text-4xl font-bold mb-4 text-lime-200'>
                                ¿Qué desea realizar hoy?
                            </h2>
                            <p className='text-xl text-green-200'>
                                Seleccione una opción tocando el botón
                                correspondiente
                            </p>

                            {!isInstalled && canInstall && (
                                <div className='mt-4 bg-blue-900 bg-opacity-50 rounded-lg p-3 max-w-md mx-auto border border-blue-400'>
                                    <p className='text-blue-200 text-sm'>
                                        💡 <strong>Recomendación:</strong>{' '}
                                        Instale esta terminal como aplicación
                                    </p>
                                    <p className='text-blue-300 text-xs mb-3'>
                                        ✨ Mejor rendimiento • 📱 Acceso directo
                                        • 🚀 Carga más rápida
                                    </p>
                                    <button
                                        onClick={handleInstallPWA}
                                        className='px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors'
                                    >
                                        📱 Instalar Terminal PWA
                                    </button>
                                </div>
                            )}

                            {isInstalled && (
                                <div className='mt-4 bg-green-800 bg-opacity-30 rounded-lg p-3 max-w-md mx-auto border border-green-400'>
                                    <p className='text-green-200 text-sm'>
                                        ✅{' '}
                                        <strong>Terminal PWA Instalada</strong>
                                    </p>
                                    <p className='text-green-300 text-xs'>
                                        Acceso directo • Optimizada para
                                        terminales • Comandos remotos
                                        habilitados
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* BOTONES PRINCIPALES */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
                            {/* Botón Pagar Factura */}
                            <button
                                onClick={irAPagarFactura}
                                className='group relative bg-gradient-to-br from-green-600 to-green-700 hover:from-lime-500 hover:to-green-600 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-green-500 hover:border-lime-400'
                            >
                                <div className='text-center'>
                                    <div className='text-8xl mb-6 group-hover:scale-110 transition-transform duration-300'>
                                        💳
                                    </div>
                                    <h3 className='text-3xl font-bold mb-4 text-white group-hover:text-lime-100'>
                                        PAGAR FACTURA
                                    </h3>
                                    <p className='text-lg text-green-100 group-hover:text-white leading-relaxed'>
                                        Consulte su estado de cuenta y<br />
                                        pague sus facturas de electricidad
                                        <br />
                                        con MercadoPago o MODO
                                    </p>
                                    <div className='mt-6 inline-flex items-center text-lime-200 group-hover:text-white'>
                                        <span className='text-lg font-semibold'>
                                            Toque para continuar
                                        </span>
                                        <span className='ml-2 text-2xl group-hover:translate-x-2 transition-transform duration-300'>
                                            →
                                        </span>
                                    </div>
                                </div>
                                <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000'></div>
                            </button>

                            {/* Botón Imprimir Formularios */}
                            <button
                                onClick={irAImprimirFormularios}
                                className='group relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-blue-500 hover:border-cyan-400'
                            >
                                <div className='text-center'>
                                    <div className='text-8xl mb-6 group-hover:scale-110 transition-transform duration-300'>
                                        🖨️
                                    </div>
                                    <h3 className='text-3xl font-bold mb-4 text-white group-hover:text-cyan-100'>
                                        MAS OPCIONES
                                    </h3>
                                    <p className='text-lg text-blue-100 group-hover:text-white leading-relaxed'>
                                        Imprima facturas anteriores,
                                        <br />
                                        formularios de servicios y<br />
                                        documentación oficial
                                    </p>
                                    <div className='mt-6 inline-flex items-center text-cyan-200 group-hover:text-white'>
                                        <span className='text-lg font-semibold'>
                                            Toque para continuar
                                        </span>
                                        <span className='ml-2 text-2xl group-hover:translate-x-2 transition-transform duration-300'>
                                            →
                                        </span>
                                    </div>
                                </div>
                                <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000'></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className='bg-green-900 p-4 text-center text-green-200'>
                    <div className='flex justify-between items-center max-w-6xl mx-auto'>
                        <div className='flex items-center gap-2'>
                            <span className='text-lg'>🔒</span>
                            <span>Conexión segura</span>
                            {isInstalled && (
                                <span className='ml-4 px-2 py-1 bg-green-700 rounded text-xs'>
                                    📱 PWA + 🎛️ TAS
                                </span>
                            )}
                        </div>
                        <div className='flex items-center gap-6'>
                            <span>📞 Mesa de ayuda: 0800-COOPE</span>
                            <span>🕐 Horario: 24hs</span>
                        </div>
                        <div className='text-sm'>
                            Terminal de Autoservicio v
                            {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                            {terminalId && (
                                <div className='text-xs font-mono text-green-300'>
                                    {terminalId.slice(-8)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
