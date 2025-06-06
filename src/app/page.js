'use client';
import { useState, useEffect } from 'react';

export default function TASLoginTerminal() {
    const [nis, setNis] = useState('');
    const [socio, setSocio] = useState('');
    const [campoActivo, setCampoActivo] = useState('nis');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const [modoSuspendido, setModoSuspendido] = useState(true);
    const [mostrarBienvenida, setMostrarBienvenida] = useState(false);

    // ⏱ Inactividad -> suspensión
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                setModoSuspendido(true);
                setNis('');
                setSocio('');
                setCampoActivo('nis');
                setError('');
            }, 2 * 60 * 1000);
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

    // ⏳ Bienvenida 2 segundos
    useEffect(() => {
        if (mostrarBienvenida) {
            const timer = setTimeout(() => {
                setMostrarBienvenida(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [mostrarBienvenida]);

    // ⌨️ Teclado físico
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (cargando || mostrarBienvenida) return;
            const key = event.key;
            if (/^[0-9]$/.test(key)) handleInput(key);
            else if (key === 'Backspace' || key === 'Delete') handleBackspace();
            else if (key === 'Enter') handleSubmit();
            else if (key === 'Tab') {
                setCampoActivo(campoActivo === 'nis' ? 'socio' : 'nis');
                setError('');
            } else if (key === 'Escape') handleClear();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [campoActivo, nis, socio, cargando, mostrarBienvenida]);

    const handleInput = (val) => {
        if (campoActivo === 'nis' && nis.length < 12) setNis(nis + val);
        if (campoActivo === 'socio' && socio.length < 8) setSocio(socio + val);
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

    const handleSubmit = async () => {
        if (!nis && !socio) return setError('DEBE INGRESAR AL MENOS UN DATO');
        if (nis && nis.length !== 12)
            return setError('NIS DEBE TENER 12 DÍGITOS');

        setError('');
        setCargando(true);

        try {
            const response = await fetch(`/api/facturas?nis=${nis}`);

            if (!response.ok) throw new Error('Error al consultar');

            const data = await response.json();

            if (!data || data.length === 0) {
                setError('NIS INCORRECTO O SIN DATOS');
            } else {
                localStorage.setItem('nis', nis);
                localStorage.setItem('nis_timestamp', Date.now().toString());
                window.location.href = `/estado-de-cuenta?nis=${nis}`;
            }
        } catch (e) {
            setError('ERROR DE CONEXIÓN');
        }

        setCargando(false);
    };
    
    

    const cambiarCampo = (campo) => {
        setCampoActivo(campo);
        setError('');
    };

    // 🎞️ Modo suspendido
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

    // 👋 Pantalla bienvenida
    if (mostrarBienvenida) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 flex items-center justify-center'>
                <div className='text-center text-white animate-pulse'>
                    <div className='mb-6'>
                        <div className='w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4'>
                            <span className='text-6xl text-green-800'>
                                <img
                                    src='/LOGO.png'
                                    alt='Pantalla suspendida'
                                    className='w-full h-full object-cover'
                                />
                            </span>
                        </div>
                    </div>
                    <h1 className='text-4xl font-bold mb-2'>BIENVENIDO</h1>
                    <p className='text-xl'>Terminal de Autoservicio</p>
                    <div className='mt-8'>
                        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white'></div>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ Pantalla principal
    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            {/* HEADER */}
            <div className='bg-gradient-to-r from-green-800 to-lime-600 p-6 shadow-lg'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <img
                            src='/LOGO.png'
                            alt='Pantalla suspendida'
                            className='max-full h-full object-cover'
                        />
                    </div>
                    <div className='text-center'>
                        <h1 className='text-2xl font-bold'>
                            TERMINAL DE AUTOSERVICIO
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
                                📍 INGRESE SU NÚMERO DE SUMINISTRO
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
                                12 dígitos • Ingresados: {nis.length}/12
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
                                👤 INGRESE SU NÚMERO DE SOCIO
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
                                        CONSULTANDO...
                                    </div>
                                ) : (
                                    'CONSULTAR ESTADO'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className='bg-green-900 p-4 text-center text-green-200 text-sm'>
                <p>🔒 Conexión segura • Tiempo de sesión restante: ∞</p>
            </div>
        </div>
    );
}
