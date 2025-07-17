// src/app/page.js - VERSIÓN CON HEARTBEAT INTELIGENTE Y EJECUCIÓN DE COMANDOS
'use client';
import { useState, useEffect } from 'react';
import { createRoute } from '../utils/routeHelper';

export default function TASHomeScreen() {
    const [modoSuspendido, setModoSuspendido] = useState(true);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    // 🆕 AUTO-REGISTRO + PROCESAMIENTO DE COMANDOS + HEARTBEAT INTELIGENTE
    useEffect(() => {
        let heartbeatInterval;
        let fastHeartbeatTimeout;
        
        // 🔧 FUNCIÓN PARA CONFIRMAR COMANDO EJECUTADO
        const confirmCommandExecution = async (commandId, success, errorMessage = null) => {
            console.log(`📤 Confirmando comando ${commandId}: ${success ? 'ÉXITO' : 'FALLO'}`);
            
            try {
                const response = await fetch('/tas-coope/api/command-executed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        command_id: commandId,
                        success: success,
                        error_message: errorMessage,
                        execution_time: Date.now(),
                        terminal_id: 'VPN_25'
                    })
                });

                if (response.ok) {
                    console.log('✅ Comando confirmado al backend');
                } else {
                    console.log('⚠️ Error confirmando comando:', response.status);
                }
            } catch (error) {
                console.log('❌ Error enviando confirmación:', error.message);
            }
        };
        
        const autoRegisterTerminal = async () => {
            try {
                console.log('🔍 Intentando auto-registro de terminal...');
                
                const response = await fetch('/tas-coope/api/terminal-register');
                const result = await response.json();
                
                console.log('📊 Resultado auto-registro:', result);
                
                if (result.registered) {
                    console.log(`✅ Terminal registrada: ${result.terminal.id} (${result.terminal.location})`);
                    
                    // 🆕 INICIALIZAR COMMAND SERVICE SI NO EXISTE
                    if (typeof window !== 'undefined' && window.debugTAS) {
                        window.debugTAS.setTerminalId(result.terminal.id);
                    }
                    
                    // 🆕 PROCESAR COMANDO SI EXISTE
                    if (result.command) {
                        console.log(`📤 Comando recibido: ${result.command}`);
                        
                        // 🆕 USAR COMMAND SERVICE SI ESTÁ DISPONIBLE
                        if (typeof window !== 'undefined' && window.debugTAS) {
                            console.log('🎯 Usando TAS Command Service para ejecutar comando...');
                            window.debugTAS.executeCommand(result.command, result.command_id);
                        } else {
                            // 🔄 FALLBACK: Lógica mejorada para comandos básicos
                            console.log('⚠️ TAS Command Service no disponible, usando fallback...');
                            
                            try {
                                switch (result.command) {
                                    case 'maintenance':
                                        console.log('🔧 Activando modo mantenimiento...');
                                        
                                        // Cambiar a modo mantenimiento
                                        setModoSuspendido(true);
                                        
                                        // Mostrar mensaje de mantenimiento en lugar del GIF
                                        const maintenanceMessage = document.createElement('div');
                                        maintenanceMessage.id = 'maintenance-overlay';
                                        maintenanceMessage.innerHTML = `
                                            <div style="
                                                position: fixed;
                                                top: 0;
                                                left: 0;
                                                width: 100%;
                                                height: 100%;
                                                background: linear-gradient(135deg, #ff6b35, #f7931e);
                                                display: flex;
                                                flex-direction: column;
                                                justify-content: center;
                                                align-items: center;
                                                color: white;
                                                font-family: Arial, sans-serif;
                                                z-index: 9999;
                                                user-select: none;
                                            ">
                                                <div style="text-align: center; max-width: 800px; padding: 40px;">
                                                    <div style="font-size: 120px; margin-bottom: 30px; animation: pulse 2s infinite;">🔧</div>
                                                    <h1 style="font-size: 60px; margin-bottom: 20px; font-weight: bold;">
                                                        MANTENIMIENTO
                                                    </h1>
                                                    <p style="font-size: 30px; margin-bottom: 40px;">
                                                        Terminal fuera de servicio temporalmente
                                                    </p>
                                                    <p style="font-size: 24px; opacity: 0.9;">
                                                        Disculpe las molestias ocasionadas
                                                    </p>
                                                    <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; margin-top: 40px;">
                                                        <p style="margin: 0; font-size: 18px;">✅ Comando ejecutado automáticamente</p>
                                                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.7;">Command ID: ${result.command_id}</p>
                                                        <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.6;">Sistema en modo mantenimiento</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <style>
                                                @keyframes pulse {
                                                    0%, 100% { transform: scale(1); opacity: 1; }
                                                    50% { transform: scale(1.1); opacity: 0.8; }
                                                }
                                            </style>
                                        `;
                                        document.body.appendChild(maintenanceMessage);
                                        document.body.style.overflow = 'hidden';
                                        
                                        // Confirmar comando ejecutado
                                        await confirmCommandExecution(result.command_id, true);
                                        console.log('✅ Comando de mantenimiento confirmado');
                                        break;
                                        
                                    case 'exit_maintenance':
                                    case 'online':
                                        console.log('✅ Saliendo del modo mantenimiento...');
                                        
                                        const overlay = document.getElementById('maintenance-overlay');
                                        if (overlay) {
                                            document.body.removeChild(overlay);
                                            document.body.style.overflow = 'auto';
                                        }
                                        
                                        setModoSuspendido(false);
                                        
                                        await confirmCommandExecution(result.command_id, true);
                                        console.log('✅ Modo mantenimiento desactivado');
                                        break;
                                        
                                    case 'restart':
                                        console.log('🔄 Reiniciando aplicación...');
                                        await confirmCommandExecution(result.command_id, true);
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 2000);
                                        break;
                                        
                                    case 'reboot':
                                        console.log('🔄 Reiniciando sistema...');
                                        await confirmCommandExecution(result.command_id, true);
                                        setTimeout(() => {
                                            try {
                                                window.close();
                                            } catch (e) {
                                                window.location.reload();
                                            }
                                        }, 3000);
                                        break;
                                        
                                    case 'show_message':
                                        console.log('💬 Mostrando mensaje...');
                                        
                                        const message = result.command_data?.message || 'Mensaje del sistema';
                                        const duration = result.command_data?.duration || 5000;
                                        
                                        const messageDiv = document.createElement('div');
                                        messageDiv.innerHTML = `
                                            <div style="
                                                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                                                background: rgba(0, 0, 0, 0.9); color: white; padding: 30px 50px;
                                                border-radius: 15px; font-size: 24px; font-weight: bold;
                                                text-align: center; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                                                border: 2px solid #059669; font-family: Arial; max-width: 80%;
                                            ">
                                                ${message}
                                            </div>
                                        `;
                                        
                                        document.body.appendChild(messageDiv);
                                        
                                        setTimeout(() => {
                                            if (document.body.contains(messageDiv)) {
                                                document.body.removeChild(messageDiv);
                                            }
                                        }, duration);
                                        
                                        await confirmCommandExecution(result.command_id, true);
                                        break;
                                        
                                    default:
                                        console.log(`⚠️ Comando desconocido: ${result.command}`);
                                        await confirmCommandExecution(result.command_id, false, `Comando no reconocido: ${result.command}`);
                                }
                            } catch (error) {
                                console.error('❌ Error ejecutando comando:', error);
                                await confirmCommandExecution(result.command_id, false, error.message);
                            }
                        }
                        
                        // 🚀 ACTIVAR HEARTBEAT RÁPIDO después de recibir comando
                        console.log('🚀 Activando heartbeat rápido por 2 minutos...');
                        startFastHeartbeat();
                        
                    } else {
                        console.log('📭 Sin comandos pendientes');
                    }
                } else {
                    console.log(`ℹ️ Terminal no registrada: ${result.reason}`);
                }
            } catch (error) {
                console.error('❌ Error en auto-registro:', error);
            }
        };
        
        // 🚀 HEARTBEAT RÁPIDO (cada 5 segundos por 2 minutos)
        const startFastHeartbeat = () => {
            // Limpiar heartbeat rápido anterior si existe
            if (fastHeartbeatTimeout) {
                clearTimeout(fastHeartbeatTimeout);
            }
            
            // Limpiar heartbeat normal y usar rápido
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
            
            console.log('⚡ Iniciando heartbeat rápido (5s)...');
            
            // Heartbeat cada 5 segundos
            const fastInterval = setInterval(async () => {
                try {
                    console.log('💨 Heartbeat rápido...');
                    await autoRegisterTerminal();
                } catch (error) {
                    console.error('❌ Fast heartbeat failed:', error);
                }
            }, 5000); // 5 segundos
            
            // Volver a heartbeat normal después de 2 minutos
            fastHeartbeatTimeout = setTimeout(() => {
                console.log('🔄 Volviendo a heartbeat normal (30s)...');
                clearInterval(fastInterval);
                startNormalHeartbeat();
            }, 2 * 60 * 1000); // 2 minutos
        };
        
        // 💓 HEARTBEAT NORMAL (cada 30 segundos)
        const startNormalHeartbeat = () => {
            heartbeatInterval = setInterval(async () => {
                try {
                    console.log('💓 Enviando heartbeat...');
                    const response = await fetch('/tas-coope/api/terminal-register');
                    const result = await response.json();
                    
                    // Procesar comandos en cada heartbeat
                    if (result.command) {
                        console.log(`📤 Nuevo comando en heartbeat: ${result.command}`);
                        // Reiniciar ciclo con heartbeat rápido
                        await autoRegisterTerminal();
                    }
                } catch (error) {
                    console.error('❌ Heartbeat failed:', error);
                }
            }, 30000); // 30 segundos
        };
        
        // Auto-registro inicial
        autoRegisterTerminal();
        
        // Iniciar heartbeat normal
        startNormalHeartbeat();
        
        // Cleanup al desmontar componente
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            if (fastHeartbeatTimeout) clearTimeout(fastHeartbeatTimeout);
        };
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
            // 🆕 VERIFICAR SI ESTÁ EN MANTENIMIENTO USANDO COMMAND SERVICE
            if (typeof window !== 'undefined' && window.debugTAS) {
                const status = window.debugTAS.getStatus();
                if (status.maintenanceActive) {
                    console.log('🔧 En modo mantenimiento - interacción bloqueada');
                    return; // Bloquear interacción durante mantenimiento
                }
            }
            
            // También verificar si hay overlay de mantenimiento
            const maintenanceOverlay = document.getElementById('maintenance-overlay');
            if (maintenanceOverlay) {
                console.log('🔧 Overlay de mantenimiento activo - interacción bloqueada');
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
        window.location.href = createRoute('/login-nis');
    };
    
    const irAImprimirFormularios = () => {
        window.location.href = createRoute('/imprimir-formularios');
    };

    // Pantalla suspendida
    if (modoSuspendido) {
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
                        // Fallback: mostrar texto si no carga la imagen
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                            <div class="text-white text-center">
                                <div class="text-8xl mb-4">💤</div>
                                <h1 class="text-4xl font-bold">PANTALLA SUSPENDIDA</h1>
                                <p class="text-xl mt-4">Toque la pantalla para continuar</p>
                            </div>
                        `;
                    }}
                />
            </div>
        );
    }

    // Pantalla de bienvenida
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
                    <p className='text-lg text-green-200'>Cooperativa Popular</p>

                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // Pantalla principal
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
                    </div>
                    <div className='flex items-center gap-6'>
                        <span>📞 Mesa de ayuda: 0800-COOPE</span>
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