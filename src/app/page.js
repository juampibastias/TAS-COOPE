// src/app/page.js - MODIFICACIÓN MÍNIMA PARA MANTENER GIF SIEMPRE ACTIVO

'use client';
import { useState, useEffect } from 'react';
import { createRoute } from '../utils/routeHelper';

export default function TASHomeScreen() {
    // 🔥 CAMBIO 1: Forzar modo suspendido siempre activo
    const [modoSuspendido, setModoSuspendido] = useState(true);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    // 🔥 CAMBIO 2: Variable para controlar si la app está lista
    const APP_READY = false; // 👈 CAMBIA A true CUANDO LA APP ESTÉ LISTA

    const logoPath = process.env.NODE_ENV === 'production' 
    ? '/tas-coope/logo.png' 
    : '/logo.png';

    // 🆕 AUTO-REGISTRO + CONTROL DE RATE LIMITING + TERMINAL ID DINÁMICO
    useEffect(() => {
        // ... TODO EL CÓDIGO EXISTENTE DE AUTO-REGISTRO SE MANTIENE IGUAL ...
        let heartbeatInterval;
        let fastHeartbeatTimeout;
        let rateLimitCount = 0;
        
        let currentTerminalId = null;
        
        const initializeTASCommandService = (terminalId) => {
            if (typeof window !== 'undefined' && terminalId) {
                import('../services/tasCommandService.js').then((module) => {
                    const tasCommandService = module.default;
                    console.log('🔧 TAS Command Service inicializado:', tasCommandService);
                    
                    tasCommandService.setTerminalId(terminalId);
                    window.tasCommandService = tasCommandService;
                    tasCommandService.checkMaintenanceStatus();
                }).catch(error => {
                    console.error('❌ Error inicializando TAS Command Service:', error);
                });
            }
        };
        
        // ... RESTO DEL CÓDIGO DE AUTO-REGISTRO SE MANTIENE IGUAL ...
        
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (fastHeartbeatTimeout) clearTimeout(fastHeartbeatTimeout);
        };
    }, []);

    // 🔥 CAMBIO 3: Modificar la lógica de inactividad
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                setModoSuspendido(true);
            }, 5 * 60 * 1000);
        };

        const handleUserInteraction = () => {
            // 🔥 MODIFICACIÓN CLAVE: Solo permitir interacción si la app está lista
            if (!APP_READY) {
                console.log('🚫 App no está lista - manteniendo GIF activo');
                return; // 👈 BLOQUEA TODA INTERACCIÓN
            }

            // 🆕 VERIFICAR SI ESTÁ EN MANTENIMIENTO
            const maintenanceOverlay = document.getElementById('maintenance-overlay') || 
                                      document.getElementById('maintenance-overlay-fallback');
            if (maintenanceOverlay) {
                console.log('🔧 En modo mantenimiento - interacción bloqueada');
                return;
            }
            
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

    // Timer para ocultar bienvenida (se mantiene igual)
    useEffect(() => {
        if (mostrarBienvenida) {
            const timer = setTimeout(() => {
                setMostrarBienvenida(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [mostrarBienvenida]);

    // Navegación (se mantiene igual)
    const irAPagarFactura = () => {
        window.location.href = createRoute('/login-nis');
    };
    
    const irAImprimirFormularios = () => {
        window.location.href = createRoute('/imprimir-formularios');
    };

    // 🔥 CAMBIO 4: Mostrar GIF siempre que no esté listo O esté suspendido
    if (!APP_READY || modoSuspendido) {
        const gifPath = process.env.NODE_ENV === 'production' 
            ? '/tas-coope/QR-COOPE.gif' 
            : '/QR-COOPE.gif';
            
        return (
            <div className='fixed inset-0 bg-black flex items-center justify-center z-50'>
                <img
                    src={gifPath}
                    alt='Pantalla suspendida'
                    className='w-full h-full object-cover'
                    onError={(e) => {
                        console.log('❌ Error cargando GIF:', gifPath);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                            <div class="text-white text-center">
                                <div class="text-8xl mb-4">💤</div>
                                <h1 class="text-4xl font-bold">SISTEMA EN PREPARACIÓN</h1>
                                <p class="text-xl mt-4">${!APP_READY ? 'Configurando servicios...' : 'Toque la pantalla para continuar'}</p>
                                ${!APP_READY ? '<div class="mt-4 animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>' : ''}
                            </div>
                        `;
                    }}
                />
                {/* 🔥 OPCIONAL: Mostrar indicador de estado */}
                {!APP_READY && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                        🔧 Sistema en preparación...
                    </div>
                )}
            </div>
        );
    }

    // Pantalla de bienvenida (se mantiene igual)
    if (mostrarBienvenida) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 flex items-center justify-center'>
                <div className='text-center text-white animate-pulse'>
                    <div className='mb-6'>
                        <div className='w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-6'>
                            <img
                                src={logoPath}
                                alt='logocooperativa'
                                className='w-full h-full object-contain'
                            />
                        </div>
                    </div>
                    <h1 className='text-5xl font-bold mb-4'>BIENVENIDO</h1>
                    <p className='text-2xl mb-2'>Terminal de Autoservicio</p>
                    <p className='text-lg text-green-200'>Cooperativa Popular</p>

                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 RESTO DE LA PANTALLA PRINCIPAL SE MANTIENE IGUAL
    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            {/* HEADER */}
            <div className='bg-gradient-to-r from-green-800 to-lime-600 p-6 shadow-2xl'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <img
                            src={logoPath}
                            alt='logocooperativa'
                            className='h-16 w-auto object-contain'
                        />
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
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className='flex-1 flex items-center justify-center p-8'>
                <div className='max-w-6xl w-full'>
                    <div className='text-center mb-12'>
                        <h2 className='text-4xl font-bold mb-4 text-lime-200'>
                            ¿Qué desea realizar hoy?
                        </h2>
                        <p className='text-xl text-green-200'>
                            Seleccione una opción tocando el botón correspondiente
                        </p>
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
                            //onClick={irAImprimirFormularios}
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
                    </div>
                    <div className='flex items-center gap-6'>
                        <span>🕐 Horario: 24hs</span>
                    </div>
                    <div className='text-sm'>
                        Terminal de Autoservicio v
                        {process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                    </div>
                </div>
            </div>
        </div>
    );
}