'use client';

import { useTASFacturas } from '../hooks/useTASFacturas';
import { useInactivityDetector } from '../hooks/useInactivityDetector';
import TASLoading from './TASLoading';
import TASCompactSummary from '../components/TASCompactSummary';
import TASFacturasGrid from '../components/TASFacturasGrid';

// Componente de Header optimizado
function Header({ onExit }) {
    const logoPath = process.env.NODE_ENV === 'production' 
    ? '/tas-coope/logo.png' 
    : '/logo.png';
    return (
        <div className='bg-gradient-to-r from-green-800 to-lime-600 p-4 shadow-lg'>
            <div className='flex justify-between items-center'>
                <img src={logoPath} alt='Logo' className='h-12' />
                <h1 className='text-xl font-bold text-center flex-1 mx-4'>
                    ESTADO DE CUENTA
                </h1>
                <button
                    onClick={onExit}
                    className='bg-red-600 hover:bg-red-500 px-6 py-3 rounded-lg text-white font-bold transition-all hover:scale-105 text-base shadow-lg'
                >
                    SALIR
                </button>
            </div>
        </div>
    );
}

// Componente de Footer compacto
function Footer({ nis, pendientes }) {
    return (
        <div className='bg-green-900 p-2 text-center text-green-200 text-xs'>
            <div className='flex justify-between items-center max-w-4xl mx-auto'>
                <span>🔒 Sesión segura</span>
                <span>NIS: {nis}</span>
                <span>Facturas pendientes</span>
            </div>
        </div>
    );
}

// Componente de Error
function ErrorScreen({ error, onBack }) {
    return (
        <div className='fixed inset-0 bg-red-900 text-white flex flex-col items-center justify-center'>
            <div className='text-center max-w-md'>
                <h2 className='text-3xl font-bold mb-4'>⚠️ ERROR</h2>
                <p className='text-xl mb-6'>{error}</p>
                <button
                    onClick={onBack}
                    className='px-8 py-4 bg-lime-600 hover:bg-lime-500 rounded-xl text-xl font-bold transition-colors'
                >
                    VOLVER AL INICIO
                </button>
            </div>
        </div>
    );
}

// Componente principal de contenido
export default function TASEstadoCuentaContent() {
    const {
        cargando,
        error,
        nis,
        cliente,
        facturasImpagas,
        totalDeuda,
        proximaFactura,
        volverAlInicio,
    } = useTASFacturas();

    // Hook de detección de inactividad (1 minuto)
    const { clearInactivityTimer } = useInactivityDetector(
        volverAlInicio,
        60000
    );

    // Función de salida que limpia el timer de inactividad
    const handleExit = () => {
        clearInactivityTimer();
        volverAlInicio();
    };

    // Estados de carga y error
    if (cargando) {
        return <TASLoading />;
    }

    if (error) {
        return <ErrorScreen error={error} onBack={handleExit} />;
    }

    // Renderizado principal
    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            <Header onExit={handleExit} />

            {/* Contenido principal con padding reducido para aprovechar mejor el espacio */}
            <div className='flex-1 p-2 flex flex-col min-h-0 gap-2'>
                <TASCompactSummary
                    cliente={cliente}
                    nis={nis}
                    totalDeuda={totalDeuda}
                    proximaFactura={proximaFactura}
                />

                <TASFacturasGrid facturasImpagas={facturasImpagas} nis={nis} />
            </div>

            <Footer nis={nis} pendientes={facturasImpagas.length} />
        </div>
    );
}
