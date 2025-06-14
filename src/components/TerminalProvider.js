// app/components/TerminalProvider.js
'use client';

import { useTerminalManager } from '../hooks/useTerminalManager';
import TerminalSetup from './TerminalSetup';

export default function TerminalProvider({ children }) {
    const {
        terminalConfig,
        status,
        isConfigured,
        showSetup,
        setShowSetup,
        updateConfig,
    } = useTerminalManager();

    // Debug en desarrollo
    if (process.env.NODE_ENV === 'development') {
        console.log('🔧 TerminalProvider render:', {
            status,
            terminalId: terminalConfig?.id,
        });
    }

    // Estado de carga inicial
    if (status === 'initializing') {
        return (
            <div className='fixed inset-0 bg-gray-900 flex items-center justify-center'>
                <div className='text-center text-white'>
                    <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4'></div>
                    <p className='text-xl'>Inicializando terminal...</p>
                </div>
            </div>
        );
    }

    // Estado de mantenimiento
    if (status === 'maintenance') {
        return (
            <div className='fixed inset-0 bg-yellow-500 flex items-center justify-center'>
                <div className='text-center text-white p-8'>
                    <div className='text-8xl mb-6'>🔧</div>
                    <h1 className='text-5xl font-bold mb-4'>
                        Terminal en Mantenimiento
                    </h1>
                    <p className='text-2xl mb-6'>
                        Por favor contacte al personal técnico
                    </p>
                    <div className='bg-black bg-opacity-30 rounded-lg p-4 inline-block'>
                        <p className='text-sm font-mono'>
                            Terminal ID: {terminalConfig?.id}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Indicador de estado en desarrollo */}
            {process.env.NODE_ENV === 'development' && terminalConfig && (
                <div className='fixed top-4 right-4 z-50 bg-black text-white px-3 py-2 rounded-lg text-sm font-mono'>
                    <div>ID: {terminalConfig.id}</div>
                    <div>Estado: {status}</div>
                    <div
                        className={`inline-block w-2 h-2 rounded-full ml-2 ${
                            status === 'online'
                                ? 'bg-green-400'
                                : status === 'connection_error'
                                ? 'bg-red-400'
                                : 'bg-yellow-400'
                        }`}
                    ></div>
                </div>
            )}

            {/* Modal de configuración */}
            <TerminalSetup
                show={showSetup || !isConfigured}
                onClose={() => setShowSetup(false)}
                currentConfig={terminalConfig}
                onSave={updateConfig}
            />

            {/* Contenido principal */}
            {children}
        </>
    );
}
