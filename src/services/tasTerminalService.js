// src/services/tasTerminalService.js
class TASTerminalService {
    constructor() {
        this.terminalId = null;
        this.config = {
            backendUrl:
                process.env.NEXT_PUBLIC_BACKEND_URL ||
                process.env.NEXT_PUBLIC_API_URL,
            heartbeatInterval:
                parseInt(process.env.NEXT_PUBLIC_HEARTBEAT_INTERVAL) || 30000,
            token: process.env.NEXT_PUBLIC_TERMINAL_ACCESS_TOKEN,
        };
        this.heartbeatTimer = null;
        this.isRegistered = false;
        this.lastCommandId = null;
        this.status = 'offline';
        this.connectionFailures = 0;
        this.maxFailures = 3;
    }

    /**
     * Inicializar el servicio TAS usando la configuración existente
     */
    async initialize() {
        try {
            console.log('🚀 Inicializando servicio TAS...');

            // Usar el terminal ID existente del deviceIdentifier
            const { getTerminalConfig, generateDeviceFingerprint } =
                await import('./deviceIdentifier');

            let config = getTerminalConfig();
            if (!config?.id) {
                const deviceId = await generateDeviceFingerprint();
                this.terminalId = deviceId;
            } else {
                this.terminalId = config.id;
            }

            console.log(`🆔 Terminal ID: ${this.terminalId}`);

            // Registrar terminal en el backend
            await this.registerTerminal();

            // Iniciar heartbeat
            this.startHeartbeat();

            console.log(`✅ Terminal TAS ${this.terminalId} inicializada`);
            return true;
        } catch (error) {
            console.error('❌ Error inicializando TAS:', error);
            this.status = 'error';
            return false;
        }
    }

    /**
     * Registrar terminal en el backend usando la estructura existente
     */
    async registerTerminal() {
        try {
            const {
                getTerminalConfig,
                getHardwareInfo,
                detectDeviceCapabilities,
            } = await import('./deviceIdentifier');

            const config = getTerminalConfig();
            const hardwareInfo = await getHardwareInfo();
            const capabilities = detectDeviceCapabilities();

            const terminalData = {
                id: this.terminalId,
                name: config?.name || `Terminal ${this.terminalId.slice(-4)}`,
                location: config?.location || 'Sin configurar',
                description: config?.description || '',
                url: window.location.origin,
                version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                type: config?.type || 'KIOSK',
                hardware: hardwareInfo,
                capabilities: {
                    payment: true,
                    printing:
                        process.env.NEXT_PUBLIC_PRINTER_ENABLED === 'true',
                    modo: process.env.NEXT_PUBLIC_MODO_ENABLED === 'true',
                    mercadopago:
                        process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true',
                    fullscreen: 'requestFullscreen' in document.documentElement,
                    touchscreen: 'ontouchstart' in window,
                    ...capabilities,
                },
            };

            const response = await fetch(
                `${this.config.backendUrl}/terminalsApi/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Terminal-Token': this.config.token,
                    },
                    body: JSON.stringify(terminalData),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Error ${response.status}: ${await response.text()}`
                );
            }

            const result = await response.json();
            console.log('✅ Terminal registrada:', result);
            this.isRegistered = true;
            this.status = 'online';
            this.connectionFailures = 0;

            return result;
        } catch (error) {
            console.error('❌ Error registrando terminal:', error);
            this.connectionFailures++;
            if (this.connectionFailures < this.maxFailures) {
                this.status = 'online'; // Permitir continuar sin registro
            } else {
                this.status = 'offline';
            }
            throw error;
        }
    }

    /**
     * Iniciar heartbeat periódico
     */
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(async () => {
            await this.sendHeartbeat();
        }, this.config.heartbeatInterval);

        // Enviar heartbeat inmediato
        this.sendHeartbeat();
    }

    /**
     * Enviar heartbeat y procesar comandos
     */
    async sendHeartbeat() {
        if (!this.terminalId) return;

        try {
            const { getHardwareInfo } = await import('./deviceIdentifier');
            const hardwareInfo = await getHardwareInfo();

            const heartbeatData = {
                status: this.status,
                version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
                timestamp: new Date().toISOString(),
                hardware: hardwareInfo,
                failures: this.connectionFailures,
                currentUrl: window.location.href,
            };

            const response = await fetch(
                `${this.config.backendUrl}/terminalsApi/${this.terminalId}/heartbeat`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Terminal-Token': this.config.token,
                    },
                    body: JSON.stringify(heartbeatData),
                }
            );

            if (!response.ok) {
                throw new Error(`Heartbeat failed: ${response.status}`);
            }

            const result = await response.json();

            // Reset de errores en heartbeat exitoso
            this.connectionFailures = 0;
            if (this.status !== 'maintenance') {
                this.status = 'online';
            }

            // 🎯 PROCESAR COMANDOS RECIBIDOS
            if (result.command && result.commandId !== this.lastCommandId) {
                this.lastCommandId = result.commandId;
                console.log(
                    `📨 Comando recibido: ${result.command} (ID: ${result.commandId})`
                );
                await this.executeCommand(
                    result.command,
                    result.commandId,
                    result.commandData
                );
            }
        } catch (error) {
            console.error('❌ Error en heartbeat:', error);
            this.connectionFailures++;

            if (this.connectionFailures >= this.maxFailures) {
                this.status = 'offline';
            }
        }
    }

    /**
     * 🎯 EJECUTAR COMANDOS RECIBIDOS DEL BACKEND
     */
    async executeCommand(command, commandId, commandData = null) {
        console.log(`🎯 Ejecutando comando: ${command} (ID: ${commandId})`);

        let success = false;
        let errorMessage = null;

        try {
            switch (command) {
                case 'reboot':
                    success = await this.handleRebootCommand();
                    break;

                case 'maintenance':
                    success = await this.handleMaintenanceCommand(true);
                    break;

                case 'online':
                    success = await this.handleMaintenanceCommand(false);
                    break;

                case 'refresh':
                    success = await this.handleRefreshCommand();
                    break;

                case 'hard_refresh':
                    success = await this.handleHardRefreshCommand();
                    break;

                case 'clear_storage':
                    success = await this.handleClearStorageCommand();
                    break;

                case 'toggle_fullscreen':
                    success = await this.handleFullscreenCommand();
                    break;

                case 'shutdown':
                    success = await this.handleShutdownCommand();
                    break;

                case 'get_info':
                    success = await this.handleGetInfoCommand();
                    break;

                default:
                    throw new Error(`Comando no reconocido: ${command}`);
            }
        } catch (error) {
            console.error(`❌ Error ejecutando comando ${command}:`, error);
            success = false;
            errorMessage = error.message;
        }

        // Confirmar ejecución al backend
        await this.confirmCommandExecution(commandId, success, errorMessage);
    }

    /**
     * Manejar comando de reinicio
     */
    async handleRebootCommand() {
        console.log('🔄 Ejecutando REINICIO de terminal...');

        // Mostrar pantalla de reinicio
        document.body.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, #1f2937, #111827); color: #fff; 
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Segoe UI', sans-serif; z-index: 99999;
        ">
          <div style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 2rem; animation: spin 2s linear infinite;">🔄</div>
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #f59e0b;">REINICIANDO TERMINAL</h1>
            <p style="font-size: 1.2rem; color: #9ca3af;">La terminal se reiniciará automáticamente...</p>
            <div style="margin-top: 2rem; background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 8px;">
              <p style="font-family: monospace; font-size: 0.9rem;">ID: ${this.terminalId}</p>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
      `;

        // Reiniciar después de 3 segundos
        setTimeout(() => {
            window.location.reload(true);
        }, 3000);

        return true;
    }

    /**
     * Manejar modo mantenimiento
     */
    async handleMaintenanceCommand(enable) {
        console.log(
            `🔧 ${enable ? 'Activando' : 'Desactivando'} modo mantenimiento...`
        );

        if (enable) {
            this.status = 'maintenance';
            this.showMaintenanceOverlay();
        } else {
            this.status = 'online';
            this.hideMaintenanceOverlay();
        }

        return true;
    }

    /**
     * Manejar comando de actualización
     */
    async handleRefreshCommand() {
        console.log('🔄 Ejecutando REFRESH de página...');
        window.location.reload();
        return true;
    }

    /**
     * Manejar refresh completo con limpieza de cache
     */
    async handleHardRefreshCommand() {
        console.log('🔄 Ejecutando HARD REFRESH...');

        // Limpiar cache del service worker
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }

        // Recargar con cache bust
        window.location.href = window.location.href + '?t=' + Date.now();
        return true;
    }

    /**
     * Manejar limpieza de storage
     */
    async handleClearStorageCommand() {
        console.log('🗑️ Limpiando storage...');

        // Guardar configuración de terminal antes de limpiar
        const { getTerminalConfig } = await import('./deviceIdentifier');
        const terminalConfig = getTerminalConfig();

        // Limpiar storage
        localStorage.clear();
        sessionStorage.clear();

        // Restaurar configuración de terminal
        if (terminalConfig) {
            const { saveTerminalConfig } = await import('./deviceIdentifier');
            saveTerminalConfig(terminalConfig);
        }

        // Limpiar IndexedDB si existe
        if ('indexedDB' in window) {
            try {
                indexedDB.deleteDatabase('default');
            } catch (e) {
                console.warn('No se pudo limpiar IndexedDB');
            }
        }

        setTimeout(() => window.location.reload(true), 1000);
        return true;
    }

    /**
     * Manejar fullscreen toggle
     */
    async handleFullscreenCommand() {
        console.log('📺 Toggle fullscreen...');

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
            return true;
        } catch (error) {
            console.error('Error con fullscreen:', error);
            return false;
        }
    }

    /**
     * Manejar comando de apagado
     */
    async handleShutdownCommand() {
        console.log('⚡ Ejecutando SHUTDOWN...');

        this.status = 'shutdown';

        // Mostrar pantalla de apagado
        document.body.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: #000; color: #fff; display: flex; 
          flex-direction: column; align-items: center; justify-content: center;
          font-family: 'Segoe UI', sans-serif; z-index: 99999;
        ">
          <div style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 2rem;">⚡</div>
            <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">TERMINAL APAGADA</h1>
            <p style="font-size: 1.2rem; color: #9ca3af;">Contacte al administrador para reactivar</p>
            <div style="margin-top: 2rem; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 8px;">
              <p style="font-family: monospace; font-size: 0.9rem;">ID: ${this.terminalId}</p>
            </div>
          </div>
        </div>
      `;

        // Detener heartbeat
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        return true;
    }

    /**
     * Manejar comando de obtener información
     */
    async handleGetInfoCommand() {
        console.log('ℹ️ Obteniendo información del terminal...');

        const { getTerminalConfig, getHardwareInfo } = await import(
            './deviceIdentifier'
        );

        const info = {
            terminalId: this.terminalId,
            status: this.status,
            config: getTerminalConfig(),
            hardware: await getHardwareInfo(),
            uptime: Date.now() - (this.startTime || Date.now()),
            url: window.location.href,
            timestamp: new Date().toISOString(),
        };

        console.log('📊 Información del terminal:', info);
        return true;
    }

    /**
     * Mostrar overlay de mantenimiento
     */
    showMaintenanceOverlay() {
        // Remover overlay anterior si existe
        this.hideMaintenanceOverlay();

        const overlay = document.createElement('div');
        overlay.id = 'tas-maintenance-overlay';
        overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; 
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: 'Segoe UI', sans-serif; z-index: 99998;
      `;

        overlay.innerHTML = `
        <div style="text-align: center; padding: 2rem; background: rgba(0,0,0,0.1); border-radius: 20px;">
          <div style="font-size: 5rem; margin-bottom: 1rem; animation: pulse 2s infinite;">🔧</div>
          <h1 style="font-size: 3rem; margin-bottom: 1rem; font-weight: bold;">TERMINAL EN MANTENIMIENTO</h1>
          <p style="font-size: 1.5rem; margin-bottom: 2rem;">Terminal temporalmente fuera de servicio</p>
          <div style="background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; font-family: monospace;">
            <p>Terminal ID: ${this.terminalId}</p>
            <p>Estado: ${this.status}</p>
          </div>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        </style>
      `;

        document.body.appendChild(overlay);
    }

    /**
     * Ocultar overlay de mantenimiento
     */
    hideMaintenanceOverlay() {
        const overlay = document.getElementById('tas-maintenance-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Confirmar ejecución de comando al backend
     */
    async confirmCommandExecution(commandId, success, errorMessage = null) {
        try {
            const response = await fetch(
                `${this.config.backendUrl}/terminalsApi/${this.terminalId}/command-executed`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Terminal-Token': this.config.token,
                    },
                    body: JSON.stringify({
                        commandId: commandId,
                        success: success,
                        error_message: errorMessage,
                        timestamp: new Date().toISOString(),
                    }),
                }
            );

            if (response.ok) {
                console.log(
                    `✅ Confirmación enviada para comando ${commandId}: ${
                        success ? 'ÉXITO' : 'FALLO'
                    }`
                );
            } else {
                console.error(`❌ Error confirmando comando ${commandId}`);
            }
        } catch (error) {
            console.error('❌ Error enviando confirmación:', error);
        }
    }

    /**
     * Detener el servicio
     */
    stop() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        this.isRegistered = false;
        this.status = 'offline';
        console.log('🛑 Servicio TAS detenido');
    }

    /**
     * Obtener estado actual
     */
    getStatus() {
        return {
            terminalId: this.terminalId,
            status: this.status,
            isRegistered: this.isRegistered,
            connectionFailures: this.connectionFailures,
            isHeartbeatActive: !!this.heartbeatTimer,
        };
    }
}

// Instancia singleton
let tasServiceInstance = null;

export function getTASService() {
    if (!tasServiceInstance) {
        tasServiceInstance = new TASTerminalService();
    }
    return tasServiceInstance;
}

export default TASTerminalService;
