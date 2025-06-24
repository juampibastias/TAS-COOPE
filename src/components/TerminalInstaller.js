import { useEffect, useState } from 'react';
import { useTerminalInstallation } from '../hooks/useTerminalInstallation';

const TerminalInstaller = ({ onTerminalReady }) => {
    const {
        isInstalled,
        isInstallSupported,
        canInstall,
        terminalId,
        installApp,
        getTerminalInfo,
    } = useTerminalInstallation();

    const [isLoading, setIsLoading] = useState(false);
    const [installStep, setInstallStep] = useState('checking');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (terminalId) {
            if (isInstalled) {
                setInstallStep('installed');
                // Notificar que la terminal está lista
                onTerminalReady?.(getTerminalInfo());
            } else if (canInstall) {
                setInstallStep('installable');
            } else {
                setInstallStep('web-only');
                // Permitir uso como web aunque no esté instalada
                onTerminalReady?.(getTerminalInfo());
            }
        }
    }, [terminalId, isInstalled, canInstall, onTerminalReady, getTerminalInfo]);

    const handleInstall = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const success = await installApp();
            if (success) {
                setInstallStep('installing');
            } else {
                setError('La instalación fue cancelada');
            }
        } catch (err) {
            setError('Error durante la instalación: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Pantalla de verificación inicial
    if (installStep === 'checking') {
        return (
            <div className='terminal-installer checking'>
                <div className='installer-content'>
                    <div className='spinner'></div>
                    <h2>🔍 Verificando terminal...</h2>
                    <p>Detectando configuración del dispositivo</p>
                </div>

                <style jsx>{`
                    .terminal-installer {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(
                            135deg,
                            #667eea 0%,
                            #764ba2 100%
                        );
                        color: white;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana,
                            sans-serif;
                    }

                    .installer-content {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 16px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .spinner {
                        width: 40px;
                        height: 40px;
                        margin: 0 auto 1rem;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        0% {
                            transform: rotate(0deg);
                        }
                        100% {
                            transform: rotate(360deg);
                        }
                    }
                `}</style>
            </div>
        );
    }

    // Pantalla de instalación disponible
    if (installStep === 'installable') {
        return (
            <div className='terminal-installer installable'>
                <div className='installer-content'>
                    <div className='terminal-icon'>📱</div>
                    <h1>Terminal TAS COOPE</h1>
                    <h2>Instalación Requerida</h2>

                    <div className='terminal-info'>
                        <p>
                            <strong>ID Terminal:</strong> {terminalId}
                        </p>
                        <p>
                            <strong>Tipo:</strong> PWA Instalable
                        </p>
                    </div>

                    <div className='installation-benefits'>
                        <h3>🎯 Beneficios de la instalación:</h3>
                        <ul>
                            <li>✅ Funciona sin conexión a internet</li>
                            <li>✅ Pantalla completa para mejor experiencia</li>
                            <li>✅ Identificación única de terminal</li>
                            <li>✅ Actualizaciones automáticas</li>
                            <li>✅ Mayor velocidad de carga</li>
                        </ul>
                    </div>

                    <div className='action-buttons'>
                        <button
                            onClick={handleInstall}
                            disabled={isLoading}
                            className='install-button primary'
                        >
                            {isLoading
                                ? '⏳ Instalando...'
                                : '📥 Instalar Terminal'}
                        </button>

                        <button
                            onClick={() => onTerminalReady?.(getTerminalInfo())}
                            className='install-button secondary'
                        >
                            🌐 Continuar sin instalar
                        </button>
                    </div>

                    {error && <div className='error-message'>⚠️ {error}</div>}
                </div>

                <style jsx>{`
                    .terminal-installer {
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(
                            135deg,
                            #1a365d 0%,
                            #2d3748 100%
                        );
                        color: white;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana,
                            sans-serif;
                        padding: 1rem;
                    }

                    .installer-content {
                        max-width: 600px;
                        text-align: center;
                        padding: 3rem;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 20px;
                        backdrop-filter: blur(15px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    }

                    .terminal-icon {
                        font-size: 4rem;
                        margin-bottom: 1rem;
                    }

                    h1 {
                        margin: 0 0 0.5rem 0;
                        font-size: 2.5rem;
                        font-weight: 700;
                    }

                    h2 {
                        margin: 0 0 2rem 0;
                        font-size: 1.5rem;
                        color: #e2e8f0;
                        font-weight: 400;
                    }

                    .terminal-info {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 1rem;
                        border-radius: 12px;
                        margin: 2rem 0;
                        font-family: 'Courier New', monospace;
                    }

                    .installation-benefits {
                        text-align: left;
                        margin: 2rem 0;
                    }

                    .installation-benefits h3 {
                        text-align: center;
                        margin-bottom: 1rem;
                        color: #90cdf4;
                    }

                    .installation-benefits ul {
                        list-style: none;
                        padding: 0;
                    }

                    .installation-benefits li {
                        padding: 0.5rem 0;
                        font-size: 1.1rem;
                    }

                    .action-buttons {
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                        margin-top: 2rem;
                    }

                    .install-button {
                        padding: 1rem 2rem;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.2rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-transform: none;
                    }

                    .install-button.primary {
                        background: linear-gradient(
                            135deg,
                            #48bb78 0%,
                            #38a169 100%
                        );
                        color: white;
                    }

                    .install-button.primary:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(72, 187, 120, 0.4);
                    }

                    .install-button.secondary {
                        background: rgba(255, 255, 255, 0.1);
                        color: #e2e8f0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .install-button.secondary:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .install-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .error-message {
                        background: rgba(245, 101, 101, 0.2);
                        color: #feb2b2;
                        padding: 1rem;
                        border-radius: 8px;
                        margin-top: 1rem;
                        border: 1px solid rgba(245, 101, 101, 0.3);
                    }

                    @media (max-width: 768px) {
                        .installer-content {
                            padding: 2rem 1rem;
                            margin: 1rem;
                        }

                        h1 {
                            font-size: 2rem;
                        }
                    }
                `}</style>
            </div>
        );
    }

    // Terminal instalada y lista
    if (installStep === 'installed') {
        return (
            <div className='terminal-ready'>
                <div className='ready-indicator'>
                    <div className='success-icon'>✅</div>
                    <h2>Terminal Lista</h2>
                    <p>ID: {terminalId}</p>
                </div>

                <style jsx>{`
                    .terminal-ready {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                    }

                    .ready-indicator {
                        background: rgba(72, 187, 120, 0.9);
                        color: white;
                        padding: 1rem;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .success-icon {
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                    }

                    h2 {
                        margin: 0;
                        font-size: 1.2rem;
                    }

                    p {
                        margin: 0.5rem 0 0 0;
                        font-family: 'Courier New', monospace;
                        font-size: 0.9rem;
                        opacity: 0.9;
                    }
                `}</style>
            </div>
        );
    }

    // Modo web sin instalación
    if (installStep === 'web-only') {
        return (
            <div className='terminal-ready web-mode'>
                <div className='ready-indicator'>
                    <div className='web-icon'>🌐</div>
                    <h2>Modo Web</h2>
                    <p>ID: {terminalId}</p>
                </div>

                <style jsx>{`
                    .terminal-ready {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 1000;
                    }

                    .ready-indicator {
                        background: rgba(66, 153, 225, 0.9);
                        color: white;
                        padding: 1rem;
                        border-radius: 12px;
                        text-align: center;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .web-icon {
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                    }

                    h2 {
                        margin: 0;
                        font-size: 1.2rem;
                    }

                    p {
                        margin: 0.5rem 0 0 0;
                        font-family: 'Courier New', monospace;
                        font-size: 0.9rem;
                        opacity: 0.9;
                    }
                `}</style>
            </div>
        );
    }

    return null;
};

export default TerminalInstaller;
