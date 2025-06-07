'use client';
import { useState, useEffect } from 'react';

export default function TASHomeScreen() {
    const [modoSuspendido, setModoSuspendido] = useState(true);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    // ⏱ Inactividad -> suspensión (5 minutos)
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                setModoSuspendido(true);
            }, 5 * 60 * 1000); // 5 minutos
        };

        const handleUserInteraction = () => {
            if (modoSuspendido) {
                setModoSuspendido(false);
                setMostrarBienvenida(true);
            }
            resetInactividad();
        };

        // Eventos de interacción
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
            }, 3000); // 3 segundos
            return () => clearTimeout(timer);
        }
    }, [mostrarBienvenida]);

    // Navegación a las diferentes funciones
    const irAPagarFactura = () => {
        window.location.href = '/login-nis'; // O la ruta de tu login actual
    };

    const irAImprimirFormularios = () => {
        window.location.href = '/imprimir-formularios'; // Nueva ruta para formularios
    };

    // Pantalla suspendida (screensaver)
    if (modoSuspendido) {
        return (
            <div className='fixed inset-0 bg-black flex items-center justify-center z-50'>
                <img
                    src='/QR COOPE.gif'
                    alt='Pantalla suspendida'
                    className='w-full h-full object-cover'
                />
            </div>
        );
    }

    // Pantalla de bienvenida temporal
    if (mostrarBienvenida) {
        return (
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
                    <p className='text-2xl mb-2'>Terminal de Autoservicio</p>
                    <p className='text-lg text-green-200'>
                        Cooperativa Popular
                    </p>
                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Pantalla principal - Menú de opciones tipo cajero
    return (
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
                    {/* Mensaje de bienvenida */}
                    <div className='text-center mb-12'>
                        <h2 className='text-4xl font-bold mb-4 text-lime-200'>
                            ¿Qué desea realizar hoy?
                        </h2>
                        <p className='text-xl text-green-200'>
                            Seleccione una opción tocando el botón
                            correspondiente
                        </p>
                    </div>

                    {/* BOTONES PRINCIPALES - Tipo cajero */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
                        {/* Botón Pagar Factura */}
                        <button
                            onClick={irAPagarFactura}
                            className='group relative bg-gradient-to-br from-green-600 to-green-700 hover:from-lime-500 hover:to-green-600 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-green-500 hover:border-lime-400'
                        >
                            <div className='text-center'>
                                {/* Icono */}
                                <div className='text-8xl mb-6 group-hover:scale-110 transition-transform duration-300'>
                                    💳
                                </div>

                                {/* Título */}
                                <h3 className='text-3xl font-bold mb-4 text-white group-hover:text-lime-100'>
                                    PAGAR FACTURA
                                </h3>

                                {/* Descripción */}
                                <p className='text-lg text-green-100 group-hover:text-white leading-relaxed'>
                                    Consulte su estado de cuenta y<br />
                                    pague sus facturas de electricidad
                                    <br />
                                    con MercadoPago o MODO
                                </p>

                                {/* Indicador visual */}
                                <div className='mt-6 inline-flex items-center text-lime-200 group-hover:text-white'>
                                    <span className='text-lg font-semibold'>
                                        Toque para continuar
                                    </span>
                                    <span className='ml-2 text-2xl group-hover:translate-x-2 transition-transform duration-300'>
                                        →
                                    </span>
                                </div>
                            </div>

                            {/* Efecto de brillo */}
                            <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000'></div>
                        </button>

                        {/* Botón Imprimir Formularios */}
                        <button
                            onClick={irAImprimirFormularios}
                            className='group relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 border-4 border-blue-500 hover:border-cyan-400'
                        >
                            <div className='text-center'>
                                {/* Icono */}
                                <div className='text-8xl mb-6 group-hover:scale-110 transition-transform duration-300'>
                                    🖨️
                                </div>

                                {/* Título */}
                                <h3 className='text-3xl font-bold mb-4 text-white group-hover:text-cyan-100'>
                                    IMPRIMIR FORMULARIOS
                                </h3>

                                {/* Descripción */}
                                <p className='text-lg text-blue-100 group-hover:text-white leading-relaxed'>
                                    Imprima facturas anteriores,
                                    <br />
                                    formularios de servicios y<br />
                                    documentación oficial
                                </p>

                                {/* Indicador visual */}
                                <div className='mt-6 inline-flex items-center text-cyan-200 group-hover:text-white'>
                                    <span className='text-lg font-semibold'>
                                        Toque para continuar
                                    </span>
                                    <span className='ml-2 text-2xl group-hover:translate-x-2 transition-transform duration-300'>
                                        →
                                    </span>
                                </div>
                            </div>

                            {/* Efecto de brillo */}
                            <div className='absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 transform translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000'></div>
                        </button>
                    </div>

                    {/* Información adicional */}
                    <div className='text-center mt-12'>
                        <p className='text-lg text-green-200'>
                            💡 <strong>Tip:</strong> También puede usar las
                            flechas del teclado para navegar
                        </p>
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
                        <span>📞 Mesa de ayuda: 0800-COOPE</span>
                        <span>🕐 Horario: 24hs</span>
                    </div>
                    <div className='text-sm'>Terminal de Autoservicio v1.0</div>
                </div>
            </div>
        </div>
    );
}
