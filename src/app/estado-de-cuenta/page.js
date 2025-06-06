'use client';
import { useEffect, useState } from 'react';

export default function EstadoCuentaPage() {
    const [facturas, setFacturas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [nis, setNis] = useState('');

    useEffect(() => {
        const storedNis =
            localStorage.getItem('nis') ||
            new URLSearchParams(window.location.search).get('nis');

        if (!storedNis || storedNis.length !== 12) {
            setError('NIS no válido');
            setCargando(false);
            return;
        }

        setNis(storedNis);

        fetch(`/api/facturas?nis=${storedNis}`)
            .then((res) => {
                if (!res.ok) throw new Error('Error al consultar');
                return res.json();
            })
            .then((data) => {
                if (!data || data.length === 0)
                    throw new Error('No se encontraron facturas');
                setFacturas(data);
                setCargando(false);
            })
            .catch((err) => {
                setError(err.message);
                setCargando(false);
            });
    }, []);

    const volverAlInicio = () => {
        localStorage.removeItem('nis');
        window.location.href = '/';
    };

    if (cargando) {
        return (
            <div className='fixed inset-0 bg-green-900 flex items-center justify-center text-white text-2xl font-bold'>
                Cargando estado de cuenta...
            </div>
        );
    }

    if (error) {
        return (
            <div className='fixed inset-0 bg-red-900 text-white flex flex-col items-center justify-center'>
                <p className='text-2xl font-bold mb-4'>{error}</p>
                <button
                    onClick={volverAlInicio}
                    className='px-6 py-4 bg-lime-600 rounded-xl text-xl font-bold'
                >
                    VOLVER
                </button>
            </div>
        );
    }

    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            {/* HEADER */}
            <div className='bg-gradient-to-r from-green-800 to-lime-600 p-6 shadow-lg flex justify-between items-center'>
                <img src='/LOGO.png' alt='Logo' className='h-12' />
                <h1 className='text-3xl font-bold text-center flex-1'>
                    ESTADO DE CUENTA
                </h1>
                <button
                    onClick={volverAlInicio}
                    className='bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-white font-bold text-sm'
                >
                    VOLVER
                </button>
            </div>

            {/* CONTENIDO */}
            <div className='flex-1 p-10 overflow-y-auto'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {facturas.map((factura, index) => (
                        <div
                            key={index}
                            className='bg-green-950/60 p-6 rounded-xl border-l-8 border-lime-500 shadow-lg'
                        >
                            <h3 className='text-xl font-bold mb-2'>
                                {factura.periodo} – Vto: {factura.vencimiento}
                            </h3>
                            <p>Monto: ${factura.total}</p>
                            <p>Estado: {factura.estado}</p>
                            <p>Detalle: {factura.detalle}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FOOTER */}
            <div className='bg-green-900 p-4 text-center text-green-200 text-sm'>
                NIS: {nis} • Total de facturas: {facturas.length}
            </div>
        </div>
    );
}
