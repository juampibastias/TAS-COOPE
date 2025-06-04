'use client';

import { useState } from 'react';

export default function ModernTASTerminal() {
    const [nis, setNis] = useState('');
    const [socio, setSocio] = useState('');
    const [campoActivo, setCampoActivo] = useState('nis');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleInput = (val) => {
        if (campoActivo === 'nis' && nis.length < 12) setNis(nis + val);
        if (campoActivo === 'socio' && socio.length < 8) setSocio(socio + val);
        setError('');
    };

    const handleBackspace = () => {
        if (campoActivo === 'nis') setNis(nis.slice(0, -1));
        else setSocio(socio.slice(0, -1));
    };

    const handleClear = () => {
        if (campoActivo === 'nis') setNis('');
        else setSocio('');
        setError('');
    };

    const handleSubmit = () => {
        if (!nis && !socio) return setError('Ingrese al menos un dato');
        if (nis && nis.length !== 12)
            return setError('NIS debe tener 12 dígitos');

        setError('');
        setCargando(true);
        setTimeout(() => {
            setCargando(false);
            alert(`📍 NIS: ${nis || '–'}\n👤 Socio: ${socio || '–'}`);
        }, 1000);
    };

    return (
        <div className='h-screen w-screen bg-black text-white flex flex-col justify-between items-center px-4 py-3'>
            {/* Header */}
            <div className='text-center'>
                <h1 className='text-3xl font-extrabold tracking-wide text-[#00ff6a]'>
                    CONSULTA DE ESTADO
                </h1>
                <p className='text-sm text-white/70'>
                    Terminal de Autoservicio • Sistema Inteligente
                </p>
            </div>

            {/* Cuerpo central */}
            <div className='flex-grow flex flex-col items-center justify-center gap-6 w-full max-w-md'>
                {/* Campos */}
                <div className='space-y-4 w-full'>
                    {[
                        { id: 'nis', label: '📍 NIS', value: nis },
                        { id: 'socio', label: '👤 Socio', value: socio },
                    ].map((campo) => (
                        <div
                            key={campo.id}
                            onClick={() => setCampoActivo(campo.id)}
                            className={`w-full rounded-xl px-4 py-3 font-mono text-lg border-2 cursor-pointer transition-all duration-200
                                ${
                                    campoActivo === campo.id
                                        ? 'border-[#00ff6a] bg-[#111926]'
                                        : 'border-[#1f2a38] bg-[#0f172a]'
                                }`}
                        >
                            <span className='font-bold text-white'>
                                {campo.label}:
                            </span>{' '}
                            <span
                                className={campo.value ? '' : 'text-white/40'}
                            >
                                {campo.value || 'Toque para ingresar'}
                            </span>
                            {campoActivo === campo.id && (
                                <span className='ml-2 animate-pulse text-[#00ff6a]'>
                                    |
                                </span>
                            )}
                        </div>
                    ))}
                    {error && (
                        <div className='text-red-500 text-center text-sm font-semibold mt-1'>
                            {error}
                        </div>
                    )}
                </div>

                {/* Teclado */}
                <div className='grid grid-cols-3 gap-3 w-full'>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                            key={n}
                            onClick={() => handleInput(n.toString())}
                            className='bg-[#1e293b] hover:bg-[#00b347] text-white text-2xl py-4 rounded-xl active:scale-95 transition'
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={handleClear}
                        className='bg-[#b80000] hover:bg-red-500 text-white text-sm font-bold py-4 rounded-xl active:scale-95 transition'
                    >
                        LIMPIAR
                    </button>
                    <button
                        onClick={() => handleInput('0')}
                        className='bg-[#1e293b] hover:bg-[#00b347] text-white text-2xl py-4 rounded-xl active:scale-95 transition'
                    >
                        0
                    </button>
                    <button
                        onClick={handleBackspace}
                        className='bg-[#ff6a00] hover:bg-orange-400 text-white text-sm font-bold py-4 rounded-xl active:scale-95 transition'
                    >
                        BORRAR
                    </button>
                </div>
            </div>

            {/* Footer con botón */}
            <div className='w-full'>
                <button
                    onClick={handleSubmit}
                    disabled={cargando}
                    className='w-full bg-[#00b347] hover:bg-[#00ff6a] text-white text-xl font-bold py-4 rounded-xl transition active:scale-95 disabled:opacity-60'
                >
                    {cargando ? 'Consultando...' : 'Consultar Estado'}
                </button>
            </div>
        </div>
    );
}
