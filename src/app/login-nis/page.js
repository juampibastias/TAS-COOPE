'use client';
import { useState, useEffect } from 'react';
import { createRoute } from '../../utils/routeHelper';

const url = process.env.NEXT_PUBLIC_API_URL;

export default function LoginNISPage() {
    const [nis, setNis] = useState('');
    const [socio, setSocio] = useState('');
    const [campoActivo, setCampoActivo] = useState('nis');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const logoPath = process.env.NODE_ENV === 'production' 
    ? '/tas-coope/logo.png' 
    : '/logo.png';

    const [modoSuspendido, setModoSuspendido] = useState(false); // Cambiado a false para mostrar directamente
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    const EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutos en milisegundos

    // ⏱ Inactividad -> volver al home (no suspensión)
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                // En lugar de suspender, volver al home
                window.location.href = '/';
            }, 2 * 60 * 1000); // 2 minutos de inactividad
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

    // Al cargar la página, revisamos si ya hay un NIS almacenado y si está dentro del tiempo de expiración
    useEffect(() => {
        const storedNis = localStorage.getItem('nis');
        const storedTime = localStorage.getItem('nis_timestamp');
        const now = new Date().getTime();

        if (storedNis && storedTime) {
            const elapsed = now - parseInt(storedTime);
            if (elapsed < EXPIRATION_TIME) {
                // Extraer suministro y socio del NIS completo almacenado
                const nisCompleto = storedNis;
                const socioParteNumeros = nisCompleto.slice(-6); // Últimos 6 dígitos son el socio
                const suministroParteNumeros = nisCompleto.slice(0, -6); // El resto es el suministro

                setNis(suministroParteNumeros);
                setSocio(socioParteNumeros);
                handleAutomaticLogin(nisCompleto);
            } else {
                // Si ha expirado, lo removemos del localStorage
                localStorage.removeItem('nis');
                localStorage.removeItem('nis_timestamp');
            }
        }
    }, []);

    useEffect(() => {
        if (mostrarBienvenida) {
            const timer = setTimeout(() => {
                setMostrarBienvenida(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [mostrarBienvenida]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (cargando || mostrarBienvenida || isLoggedIn) return;
            const key = event.key;
            if (/^[0-9]$/.test(key)) handleInput(key);
            else if (key === 'Backspace' || key === 'Delete') handleBackspace();
            else if (key === 'Enter') {
                if (campoActivo === 'nis') {
                    setCampoActivo('socio');
                } else if (campoActivo === 'socio') {
                    handleSubmit();
                }
            } else if (key === 'Tab') {
                event.preventDefault();
                setCampoActivo(campoActivo === 'nis' ? 'socio' : 'nis');
                setError('');
            } else if (key === 'Escape') {
                // ESC para volver al home
                window.location.href = '/';
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [campoActivo, nis, socio, cargando, mostrarBienvenida, isLoggedIn]);

    // Función de manejo del login automático (valida el NIS)
    const handleAutomaticLogin = async (nisCompleto) => {
        console.log(
            '[LOGIN AUTO] Iniciando login automático para NIS:',
            nisCompleto
        );

        try {
            const endpoint = `${url}/api/facturas?nis=${nisCompleto}`;
            console.log('[LOGIN AUTO] Fetch a URL:', endpoint);

            const response = await fetch(endpoint);

            if (response.ok) {
                const data = await response.json();
                console.log(
                    '[LOGIN AUTO] Respuesta OK, datos recibidos:',
                    data
                );

                if (data.length === 0) {
                    console.warn('[LOGIN AUTO] NIS incorrecto, sin datos.');
                    setError('El número de Suministro / NIS es incorrecto.');
                    localStorage.removeItem('nis');
                    localStorage.removeItem('nis_timestamp');
                    setIsLoggedIn(false);
                    return;
                }

                const now = new Date().getTime();
                localStorage.setItem('nis', nisCompleto);
                localStorage.setItem('nis_timestamp', now.toString());
                setIsLoggedIn(true);
                setError('');

                console.log('[LOGIN AUTO] Login exitoso, redirigiendo...');
                window.location.href = `/estado-de-cuenta?nis=${nisCompleto}`;
            } else {
                console.error(
                    '[LOGIN AUTO] Error en la respuesta del servidor:',
                    response.status,
                    response.statusText
                );
            }
        } catch (error) {
            console.error('[LOGIN AUTO] Error en el fetch:', error);
        }
    };

    const handleInput = (val) => {
        if (campoActivo === 'nis' && nis.length < 6) setNis(nis + val);
        if (campoActivo === 'socio' && socio.length < 6) setSocio(socio + val);
        setError('');
    };

    const handleBackspace = () => {
        if (campoActivo === 'nis') setNis(nis.slice(0, -1));
        else setSocio(socio.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setNis('');
        setSocio('');
        setError('');
    };

    const volverAlHome = () => {
        window.location.href = createRoute('/');
    };

    const handleSubmit = async () => {
        if (!nis || !socio) {
            console.warn('[SUBMIT] Faltan datos: nis o socio vacíos');
            setError('DEBE INGRESAR AMBOS DATOS');
            return;
        }

        // Construcción correcta: suministro + socio (rellenado con ceros)
        const nisCompleto = `${parseInt(nis)}${socio.padStart(6, '0')}`;

        console.log(
            '[SUBMIT] Datos ingresados - Suministro (NIS):',
            nis,
            'Socio:',
            socio
        );
        console.log('[SUBMIT] Enviando NIS completo:', nisCompleto);

        setError('');
        setCargando(true);

        try {
            const endpoint = `${url}/api/facturas?nis=${nisCompleto}`;
            console.log('[FETCH] URL completa:', endpoint);
            console.log('[FETCH] Variable url:', url);
            console.log('[FETCH] NIS completo enviado:', nisCompleto);

            const response = await fetch(endpoint);
            console.log('[FETCH] Status de respuesta:', response.status);
            console.log('[FETCH] Response OK?:', response.ok);

            if (!response.ok) {
                console.error(
                    '[FETCH] Respuesta no OK:',
                    response.status,
                    response.statusText
                );
                const errorText = await response.text();
                console.error('[FETCH] Texto de error:', errorText);
                throw new Error('Respuesta no OK');
            }

            const data = await response.json();
            console.log('[FETCH] Datos recibidos completos:', data);
            console.log('[FETCH] Tipo de datos:', typeof data);
            console.log('[FETCH] Es array?:', Array.isArray(data));
            console.log('[FETCH] Length:', data?.length);

            if (!data || data.length === 0) {
                console.warn('[FETCH] NIS válido pero sin datos.');
                setError('NIS INCORRECTO O SIN DATOS');
            } else {
                console.log('[VALIDACIÓN OK] Datos válidos. Redirigiendo...');

                const now = new Date().getTime();
                localStorage.setItem('nis', nisCompleto);
                localStorage.setItem('nis_timestamp', now.toString());

                setIsLoggedIn(true);
                window.location.href = createRoute(`/estado-de-cuenta?nis=${nisCompleto}`);
            }
        } catch (e) {
            console.error('[ERROR] Fallo al validar NIS:', e);
            console.error('[ERROR] Mensaje completo:', e.message);
            setError('ERROR DE CONEXIÓN');
        }

        setCargando(false);
    };

    const cambiarCampo = (campo) => {
        setCampoActivo(campo);
        setError('');
    };

    // Render suspendido (solo si se activa manualmente)
    if (modoSuspendido) {
        return (
            <div className='fixed inset-0 bg-black flex items-center justify-center z-50'>
                <img
                    src='/QR-COOPE.gif'
                    alt='Pantalla suspendida'
                    className='w-full h-full object-cover'
                />
            </div>
        );
    }

    // Render bienvenida
    if (mostrarBienvenida) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 flex items-center justify-center'>
                <div className='text-center text-white animate-pulse'>
                    <div className='mb-6'>
                        <div className='w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4'>
                            <img
                                src='/LOGO.png'
                                alt='Logo Cooperativa'
                                className='w-full h-full object-cover'
                            />
                        </div>
                    </div>
                    <h1 className='text-4xl font-bold mb-2'>
                        ACCESO AL SISTEMA
                    </h1>
                    <p className='text-xl'>Ingrese sus datos para continuar</p>
                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // Pantalla de usuario logueado
    if (isLoggedIn) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex items-center justify-center'>
                <div className='text-center'>
                    <h2 className='text-3xl font-bold mb-4'>
                        ✅ Acceso autorizado
                    </h2>
                    <p className='text-xl'>
                        Redirigiendo al estado de cuenta...
                    </p>
                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Pantalla principal de login
    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            {/* HEADER CON BOTÓN DE VOLVER */}
            <div className='bg-gradient-to-r from-green-800 to-lime-600 p-6 shadow-lg'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <img
                            src={logoPath} 
                            alt='Logo Cooperativa'
                            className='h-12 w-auto object-contain'
                        />
                    </div>
                    <div className='text-center'>
                        <h1 className='text-2xl font-bold'>
                            ACCESO AL SISTEMA
                        </h1>
                        <p className='text-green-100 text-sm'>
                            Consulta de Estado de Cuenta
                        </p>
                    </div>
                    <div className='text-right text-sm text-green-100'>
                        <div>{new Date().toLocaleDateString()}</div>
                        <div>{new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            </div>

            {/* FORM + TECLADO */}
            <div className='flex-1 flex'>
                {/* FORM */}
                <div className='w-1/2 p-8 flex flex-col justify-center'>
                    <div className='max-w-md mx-auto w-full'>
                        <h2 className='text-3xl font-bold mb-8 text-center'>
                            INGRESE SUS DATOS
                        </h2>

                        {/* NIS */}
                        <div
                            className={`mb-6 p-6 rounded-xl border-4 cursor-pointer transition-all duration-300 ${
                                campoActivo === 'nis'
                                    ? 'border-lime-400 bg-green-800/50 shadow-xl'
                                    : 'border-green-600 bg-green-900/30 hover:border-lime-500'
                            }`}
                            onClick={() => cambiarCampo('nis')}
                        >
                            <label className='block text-lg font-semibold mb-2 text-lime-200'>
                                📍 INGRESE SU NÚMERO DE SOCIO
                            </label>
                            <div className='text-2xl font-mono bg-black/30 p-4 rounded-lg border-2 border-green-600'>
                                {nis ||
                                    (campoActivo === 'nis'
                                        ? '|'
                                        : 'Toque para ingresar')}
                                {campoActivo === 'nis' && nis && (
                                    <span className='animate-pulse ml-1'>
                                        |
                                    </span>
                                )}
                            </div>
                            <p className='text-sm text-green-200 mt-2'>
                                6 dígitos • Ingresados: {nis.length}/6
                            </p>
                        </div>

                        {/* SOCIO */}
                        <div
                            className={`mb-6 p-6 rounded-xl border-4 cursor-pointer transition-all duration-300 ${
                                campoActivo === 'socio'
                                    ? 'border-lime-400 bg-green-800/50 shadow-xl'
                                    : 'border-green-600 bg-green-900/30 hover:border-lime-500'
                            }`}
                            onClick={() => cambiarCampo('socio')}
                        >
                            <label className='block text-lg font-semibold mb-2 text-lime-200'>
                                👤 INGRESE SU NÚMERO DE SUMINISTRO
                            </label>
                            <div className='text-2xl font-mono bg-black/30 p-4 rounded-lg border-2 border-green-600'>
                                {socio ||
                                    (campoActivo === 'socio'
                                        ? '|'
                                        : 'Toque para ingresar')}
                                {campoActivo === 'socio' && socio && (
                                    <span className='animate-pulse ml-1'>
                                        |
                                    </span>
                                )}
                            </div>
                            <p className='text-sm text-green-200 mt-2'>
                                Máximo 8 dígitos • Ingresados: {socio.length}/8
                            </p>
                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className='mb-6 p-4 bg-red-600/20 border-2 border-red-500 rounded-xl'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-2xl'>⚠️</span>
                                    <span className='text-lg font-semibold text-red-200'>
                                        {error}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* DEBUG INFO - TEMPORAL */}
                        {/* {(nis || socio) && (
                            <div className='mb-6 p-4 bg-blue-600/20 border-2 border-blue-500 rounded-xl'>
                                <div className='text-sm text-blue-200'>
                                    <div>Suministro ingresado: "{nis}"</div>
                                    <div>Socio ingresado: "{socio}"</div>
                                    <div>
                                        NIS completo que se enviará: "
                                        {parseInt(nis || '0')}
                                        {(socio || '').padStart(6, '0')}"
                                    </div>
                                </div>
                            </div>
                        )} */}
                    </div>
                </div>

                {/* TECLADO */}
                <div className='w-1/2 p-26 bg-green-800/30'>
                    <div className='max-w-md mx-auto'>
                        <h3 className='text-2xl font-bold mb-6 text-center'>
                            TECLADO NUMÉRICO
                        </h3>
                        <div className='grid grid-cols-3 gap-4 mb-6'>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleInput(num.toString())}
                                    className='h-16 text-3xl font-bold bg-green-700 hover:bg-lime-600 rounded-xl transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl'
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <div className='grid grid-cols-3 gap-4 mb-6'>
                            <button
                                onClick={handleClear}
                                className='h-16 text-lg font-bold bg-red-600 hover:bg-red-500 rounded-xl transition-all duration-200 active:scale-95 shadow-lg'
                            >
                                LIMPIAR
                            </button>
                            <button
                                onClick={() => handleInput('0')}
                                className='h-16 text-3xl font-bold bg-green-700 hover:bg-lime-600 rounded-xl transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl'
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                className='h-16 text-lg font-bold bg-orange-600 hover:bg-orange-500 rounded-xl transition-all duration-200 active:scale-95 shadow-lg'
                            >
                                BORRAR
                            </button>
                        </div>
                        <div className='space-y-3'>
                            <button
                                onClick={handleSubmit}
                                disabled={cargando}
                                className={`w-full py-6 text-2xl font-bold rounded-xl transition-all duration-300 ${
                                    cargando
                                        ? 'bg-gray-600 cursor-not-allowed'
                                        : 'bg-lime-600 hover:bg-lime-500 active:scale-95 shadow-lg hover:shadow-xl'
                                }`}
                            >
                                {cargando ? (
                                    <div className='flex items-center justify-center gap-3'>
                                        <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-white'></div>
                                        VALIDANDO...
                                    </div>
                                ) : (
                                    'ACCEDER AL SISTEMA'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className='bg-green-900 p-4 text-center text-green-200 text-sm'>
                <button
                    onClick={volverAlHome}
                    className='bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-white font-bold transition-colors text-sm flex items-center gap-2'
                >
                    ← VOLVER
                </button>
                <div className='flex justify-between items-center max-w-6xl mx-auto'>
                    <span>🔒 Conexión segura</span>
                    <span>Presione ESC para volver al menú principal</span>
                    <span>💡 Use TAB para cambiar de campo</span>
                </div>
            </div>
        </div>
    );
}
