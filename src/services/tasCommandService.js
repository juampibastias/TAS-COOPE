// src/services/tasCommandService.js - VERSIÓN COMPATIBLE CON SSR

class TASCommandService {
    constructor() {
        this.commandHistory = [];
        this.maintenanceActive = false;
        this.terminalId = null;
        this.isClient = typeof window !== 'undefined';
        
        // Solo inicializar en el cliente
        if (this.isClient) {
            this.init();
        }
    }

    // 🔧 INICIALIZAR Y RECUPERAR ESTADO PERSISTENTE (SOLO EN CLIENTE)
    init() {
        if (!this.isClient) return;
        
        try {
            // Recuperar estado de mantenimiento al cargar
            const savedMaintenanceState = localStorage.getItem('tas_maintenance_active');
            const savedTerminalId = localStorage.getItem('tas_terminal_id');
            
            if (savedMaintenanceState === 'true') {
                console.log('🔧 [TAS-Commands] Recuperando estado de mantenimiento...');
                this.maintenanceActive = true;
                this.terminalId = savedTerminalId;
                
                // Reactivar overlay de mantenimiento después de que el DOM esté listo
                setTimeout(() => {
                    this.activateMaintenanceOverlay();
                    this.reportMaintenanceStatus();
                }, 100);
            }
            
            console.log('✅ [TAS-Commands] Servicio inicializado en cliente');
        } catch (error) {
            console.error('❌ [TAS-Commands] Error en inicialización:', error);
        }
    }

    // 🔧 HELPER PARA VERIFICAR SI PODEMOS USAR LOCALSTORAGE
    canUseStorage() {
        return this.isClient && typeof localStorage !== 'undefined';
    }

    // 🔧 HELPER PARA OBTENER VALOR DE LOCALSTORAGE DE FORMA SEGURA
    getStorageItem(key) {
        if (!this.canUseStorage()) return null;
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn('Error accediendo a localStorage:', error);
            return null;
        }
    }

    // 🔧 HELPER PARA GUARDAR EN LOCALSTORAGE DE FORMA SEGURA
    setStorageItem(key, value) {
        if (!this.canUseStorage()) return;
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.warn('Error guardando en localStorage:', error);
        }
    }

    // 🔧 HELPER PARA REMOVER DE LOCALSTORAGE DE FORMA SEGURA
    removeStorageItem(key) {
        if (!this.canUseStorage()) return;
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Error removiendo de localStorage:', error);
        }
    }

    // 🎯 FUNCIÓN PRINCIPAL PARA EJECUTAR COMANDOS
    async executeCommand(command, commandId = null, commandData = null) {
        console.log(`🎯 [TAS-Commands] Ejecutando comando: ${command}`, { commandId, commandData });
        
        const execution = {
            command,
            commandId,
            commandData,
            timestamp: new Date().toISOString(),
            success: false,
            error: null
        };

        try {
            switch (command.toLowerCase()) {
                case 'maintenance':
                    await this.activateMaintenance();
                    execution.success = true;
                    break;

                case 'exit_maintenance':
                case 'online':
                    console.log(`🎯 [TAS-Commands] Comando ${command} → Saliendo de mantenimiento`);
                    await this.exitMaintenance();
                    execution.success = true;
                    break;

                case 'restart':
                case 'refresh':
                    await this.restartApplication();
                    execution.success = true;
                    break;

                case 'reboot':
                    await this.rebootSystem();
                    execution.success = true;
                    break;

                case 'clear_cache':
                    await this.clearCache();
                    execution.success = true;
                    break;

                case 'test_printer':
                    await this.testPrinter();
                    execution.success = true;
                    break;

                case 'show_message':
                    await this.showMessage(commandData?.message || 'Mensaje del sistema');
                    execution.success = true;
                    break;

                case 'fullscreen':
                    await this.toggleFullscreen(commandData?.enable !== false);
                    execution.success = true;
                    break;

                case 'screenshot':
                    await this.takeScreenshot();
                    execution.success = true;
                    break;

                default:
                    console.warn(`⚠️ [TAS-Commands] Comando no reconocido: ${command}`);
                    execution.error = `Comando no reconocido: ${command}`;
                    execution.success = false;
            }

            // 📤 CONFIRMAR EJECUCIÓN AL BACKEND
            if (commandId && execution.success) {
                await this.confirmCommandExecution(commandId, execution.success, execution.error);
            }

        } catch (error) {
            console.error(`❌ [TAS-Commands] Error ejecutando ${command}:`, error);
            execution.success = false;
            execution.error = error.message;

            // 📤 REPORTAR ERROR AL BACKEND
            if (commandId) {
                await this.confirmCommandExecution(commandId, false, error.message);
            }
        }

        // 📊 GUARDAR EN HISTORIAL
        this.commandHistory.push(execution);
        return execution;
    }

    // 🔧 ACTIVAR MODO MANTENIMIENTO CON PERSISTENCIA
    async activateMaintenance() {
        console.log('🔧 [TAS-Commands] Activando modo mantenimiento...');
        
        this.maintenanceActive = true;
        
        // 💾 PERSISTIR ESTADO (SOLO EN CLIENTE)
        this.setStorageItem('tas_maintenance_active', 'true');
        this.setStorageItem('tas_terminal_id', this.terminalId || 'UNKNOWN');
        this.setStorageItem('tas_maintenance_start', new Date().toISOString());
        
        // Crear overlay solo en cliente
        if (this.isClient) {
            this.activateMaintenanceOverlay();
        }
        
        // 📡 REPORTAR AL BACKEND
        await this.reportMaintenanceStatus();
        
        console.log('✅ [TAS-Commands] Modo mantenimiento activado y persistido');
    }

    // 🔧 CREAR OVERLAY DE MANTENIMIENTO (SOLO EN CLIENTE)
    activateMaintenanceOverlay() {
        if (!this.isClient) return;
        
        // Remover overlay anterior si existe
        const existingOverlay = document.getElementById('maintenance-overlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }
        
        const startTime = this.getStorageItem('tas_maintenance_start') || new Date().toISOString();
        
        const maintenanceOverlay = document.createElement('div');
        maintenanceOverlay.id = 'maintenance-overlay';
        maintenanceOverlay.innerHTML = `
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
                    <h1 style="font-size: 60px; margin-bottom: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                        MANTENIMIENTO
                    </h1>
                    <p style="font-size: 30px; margin-bottom: 40px; opacity: 0.9;">
                        Terminal fuera de servicio temporalmente
                    </p>
                    <p style="font-size: 24px; opacity: 0.8; margin-bottom: 40px;">
                        Disculpe las molestias ocasionadas
                    </p>
                    <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px; font-size: 18px;">
                        <p style="margin: 0;">🕐 Mantenimiento iniciado: ${new Date(startTime).toLocaleString('es-AR')}</p>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.7;">ID Terminal: ${this.terminalId || 'TAS-001'}</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.6;">Estado persistente - No se puede salir sin comando del backend</p>
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
        
        document.body.appendChild(maintenanceOverlay);
        
        // Bloquear interacciones
        document.body.style.overflow = 'hidden';
    }

    // ✅ SALIR DEL MODO MANTENIMIENTO
    async exitMaintenance() {
        console.log('✅ [TAS-Commands] Saliendo del modo mantenimiento...');
        
        this.maintenanceActive = false;
        
        // 🗑️ LIMPIAR PERSISTENCIA
        this.removeStorageItem('tas_maintenance_active');
        this.removeStorageItem('tas_maintenance_start');
        
        if (this.isClient) {
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) {
                document.body.removeChild(overlay);
                console.log('🗑️ [TAS-Commands] Overlay de mantenimiento removido');
            }
            
            document.body.style.overflow = 'auto';
        }
        
        // 📡 REPORTAR AL BACKEND INMEDIATAMENTE
        await this.reportMaintenanceStatus();
        
        console.log('✅ [TAS-Commands] Modo mantenimiento desactivado completamente');
        
        // 💫 MOSTRAR MENSAJE DE CONFIRMACIÓN
        this.showTemporaryMessage('✅ Modo mantenimiento desactivado', 3000);
    }

    // 📡 REPORTAR ESTADO DE MANTENIMIENTO AL BACKEND
    async reportMaintenanceStatus() {
        if (!this.isClient) return;
        
        try {
            const status = this.maintenanceActive ? 'maintenance' : 'online';
            
            console.log(`📡 [TAS-Commands] Reportando estado ${status} al backend...`);
            
            const response = await fetch('/tas-coope/api/terminal-register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    maintenance_active: this.maintenanceActive,
                    version: '2.0.0-commands',
                    last_command: this.commandHistory[this.commandHistory.length - 1]?.command || null
                })
            });

            if (response.ok) {
                console.log(`✅ [TAS-Commands] Estado ${status} reportado correctamente al backend`);
            } else {
                console.warn('⚠️ [TAS-Commands] Error reportando estado:', response.statusText);
            }
        } catch (error) {
            console.error('❌ [TAS-Commands] Error comunicando con backend:', error);
        }
    }

    // 🔄 REINICIAR APLICACIÓN
    async restartApplication() {
        console.log('🔄 [TAS-Commands] Reiniciando aplicación...');
        
        if (this.isClient) {
            // Mostrar mensaje de reinicio
            this.showTemporaryMessage('🔄 Reiniciando sistema...', 2000);
            
            // Esperar 2 segundos y recargar
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    }

    // 💻 REINICIAR SISTEMA (REBOOT)
    async rebootSystem() {
        console.log('💻 [TAS-Commands] Reiniciando sistema completo...');
        
        if (this.isClient) {
            // Mostrar mensaje de reboot
            this.showTemporaryMessage('💻 Reiniciando sistema completo...', 3000);
            
            // Intentar cerrar ventana o recargar después de 3 segundos
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.log('No se puede cerrar la ventana, recargando...');
                    window.location.reload();
                }
            }, 3000);
        }
    }

    // 🧹 LIMPIAR CACHÉ
    async clearCache() {
        console.log('🧹 [TAS-Commands] Limpiando caché...');
        
        if (!this.isClient) return;
        
        try {
            // NO limpiar las claves de mantenimiento
            const maintenanceActive = this.getStorageItem('tas_maintenance_active');
            const maintenanceStart = this.getStorageItem('tas_maintenance_start');
            const terminalId = this.getStorageItem('tas_terminal_id');
            
            // Limpiar localStorage
            localStorage.clear();
            
            // Restaurar estado de mantenimiento si estaba activo
            if (maintenanceActive === 'true') {
                this.setStorageItem('tas_maintenance_active', 'true');
                this.setStorageItem('tas_maintenance_start', maintenanceStart);
                this.setStorageItem('tas_terminal_id', terminalId);
            }
            
            // Limpiar sessionStorage
            sessionStorage.clear();
            
            // Limpiar cookies (si es posible)
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            
            this.showTemporaryMessage('🧹 Caché limpiado correctamente', 2000);
            
            console.log('✅ [TAS-Commands] Caché limpiado (manteniendo estado de mantenimiento)');
        } catch (error) {
            console.error('❌ [TAS-Commands] Error limpiando caché:', error);
            throw error;
        }
    }

    // 🖨️ TEST DE IMPRESORA
    async testPrinter() {
        console.log('🖨️ [TAS-Commands] Ejecutando test de impresora...');
        
        try {
            // Importar dinámicamente el servicio de impresión
            const { testPrintTicket } = await import('./browserPrintService');
            
            const testData = {
                cliente: 'TEST MANTENIMIENTO',
                nis: '0000001',
                factura: 'TEST_' + Date.now(),
                fecha: new Date().toLocaleDateString('es-AR'),
                importe: '100',
                vencimiento: '1° Vencimiento',
                metodoPago: 'TEST',
                transactionId: 'MAINT_' + Date.now(),
                fechaPago: new Date().toLocaleString('es-AR')
            };
            
            await testPrintTicket(testData);
            
            this.showTemporaryMessage('🖨️ Test de impresora ejecutado', 3000);
            
            console.log('✅ [TAS-Commands] Test de impresora completado');
        } catch (error) {
            console.error('❌ [TAS-Commands] Error en test de impresora:', error);
            this.showTemporaryMessage('❌ Error en test de impresora', 3000);
            throw error;
        }
    }

    // 💬 MOSTRAR MENSAJE
    async showMessage(message, duration = 5000) {
        console.log(`💬 [TAS-Commands] Mostrando mensaje: ${message}`);
        
        this.showTemporaryMessage(message, duration);
    }

    // 🖥️ TOGGLE FULLSCREEN
    async toggleFullscreen(enable = true) {
        console.log(`🖥️ [TAS-Commands] ${enable ? 'Activando' : 'Desactivando'} pantalla completa...`);
        
        if (!this.isClient) return;
        
        try {
            if (enable) {
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen && document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            }
            
            console.log(`✅ [TAS-Commands] Pantalla completa ${enable ? 'activada' : 'desactivada'}`);
        } catch (error) {
            console.error('❌ [TAS-Commands] Error con pantalla completa:', error);
            throw error;
        }
    }

    // 📸 CAPTURA DE PANTALLA
    async takeScreenshot() {
        console.log('📸 [TAS-Commands] Tomando captura de pantalla...');
        
        if (!this.isClient) return;
        
        try {
            // Usar html2canvas si está disponible, o método nativo
            if (window.html2canvas) {
                const canvas = await html2canvas(document.body);
                const dataUrl = canvas.toDataURL();
                
                // Enviar al backend
                await this.sendScreenshotToBackend(dataUrl);
            } else {
                console.warn('⚠️ html2canvas no disponible para captura');
                this.showTemporaryMessage('📸 Captura solicitada (sin html2canvas)', 2000);
            }
            
            console.log('✅ [TAS-Commands] Captura completada');
        } catch (error) {
            console.error('❌ [TAS-Commands] Error en captura:', error);
            throw error;
        }
    }

    // 📤 CONFIRMAR EJECUCIÓN DE COMANDO AL BACKEND
    async confirmCommandExecution(commandId, success, errorMessage = null) {
        if (!this.isClient) return;
        
        try {
            console.log(`📤 [TAS-Commands] Confirmando comando ${commandId}: ${success ? 'ÉXITO' : 'FALLO'}`);
            
            const response = await fetch('/tas-coope/api/command-executed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command_id: commandId,
                    success: success,
                    error_message: errorMessage,
                    execution_time: Date.now(),
                    terminal_id: this.terminalId,
                    maintenance_active: this.maintenanceActive
                })
            });

            if (response.ok) {
                console.log('✅ [TAS-Commands] Comando confirmado al backend');
            } else {
                console.warn('⚠️ [TAS-Commands] Error confirmando comando:', response.statusText);
            }
        } catch (error) {
            console.error('❌ [TAS-Commands] Error enviando confirmación:', error);
        }
    }

    // 📤 ENVIAR CAPTURA AL BACKEND
    async sendScreenshotToBackend(dataUrl) {
        if (!this.isClient) return;
        
        try {
            const response = await fetch('/tas-coope/api/terminal-screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    terminal_id: this.terminalId,
                    screenshot: dataUrl,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('✅ [TAS-Commands] Captura enviada al backend');
                this.showTemporaryMessage('📸 Captura enviada correctamente', 2000);
            }
        } catch (error) {
            console.error('❌ [TAS-Commands] Error enviando captura:', error);
        }
    }

    // 💭 MOSTRAR MENSAJE TEMPORAL
    showTemporaryMessage(message, duration = 3000) {
        if (!this.isClient) return;
        
        // Si está en mantenimiento, mostrar mensaje sobre el overlay
        const zIndex = this.maintenanceActive ? 10001 : 10000;
        
        // Remover mensaje anterior si existe
        const existing = document.getElementById('tas-temp-message');
        if (existing) {
            document.body.removeChild(existing);
        }

        const messageDiv = document.createElement('div');
        messageDiv.id = 'tas-temp-message';
        messageDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 30px 50px;
                border-radius: 15px;
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                z-index: ${zIndex};
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                border: 2px solid #059669;
                font-family: Arial, sans-serif;
                max-width: 80%;
                word-wrap: break-word;
            ">
                ${message}
            </div>
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            try {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            } catch (e) {
                console.warn('Error removiendo mensaje temporal:', e);
            }
        }, duration);
    }

    // 🔧 CONFIGURAR TERMINAL ID
    setTerminalId(terminalId) {
        this.terminalId = terminalId;
        this.setStorageItem('tas_terminal_id', terminalId);
        console.log(`🔧 [TAS-Commands] Terminal ID configurado: ${terminalId}`);
    }

    // 📊 OBTENER HISTORIAL DE COMANDOS
    getCommandHistory() {
        return this.commandHistory;
    }

    // 🧹 LIMPIAR HISTORIAL
    clearCommandHistory() {
        this.commandHistory = [];
        console.log('🧹 [TAS-Commands] Historial de comandos limpiado');
    }

    // ❓ OBTENER ESTADO (COMPATIBLE CON SSR)
    getStatus() {
        return {
            maintenanceActive: this.maintenanceActive,
            terminalId: this.terminalId,
            commandCount: this.commandHistory.length,
            lastCommand: this.commandHistory[this.commandHistory.length - 1] || null,
            persistedMaintenance: this.getStorageItem('tas_maintenance_active') === 'true',
            isClient: this.isClient
        };
    }

    // 🔧 VERIFICAR ESTADO EN CADA HEARTBEAT
    async checkMaintenanceStatus() {
        if (!this.isClient) return;
        
        // Verificar si el estado local coincide con el persistido
        const persistedMaintenance = this.getStorageItem('tas_maintenance_active') === 'true';
        
        if (persistedMaintenance && !this.maintenanceActive) {
            console.log('🔧 [TAS-Commands] Reactivando mantenimiento desde estado persistido...');
            this.maintenanceActive = true;
            this.activateMaintenanceOverlay();
        }
        
        // Reportar estado actual al backend en cada check
        await this.reportMaintenanceStatus();
    }
}

// 🌟 CREAR INSTANCIA GLOBAL
const tasCommandService = new TASCommandService();

// 🌐 EXPORTAR PARA USO EN OTROS MÓDULOS
export default tasCommandService;

// 🔧 TAMBIÉN DISPONIBLE GLOBALMENTE PARA DEBUG (SOLO EN CLIENTE)
if (typeof window !== 'undefined') {
    window.tasCommandService = tasCommandService;
    
    // Funciones de debug
    window.debugTAS = {
        executeCommand: (command, data) => tasCommandService.executeCommand(command, null, data),
        activateMaintenance: () => tasCommandService.activateMaintenance(),
        exitMaintenance: () => tasCommandService.exitMaintenance(),
        getStatus: () => tasCommandService.getStatus(),
        getHistory: () => tasCommandService.getCommandHistory(),
        checkStatus: () => tasCommandService.checkMaintenanceStatus(),
        clearMaintenanceState: () => {
            if (tasCommandService.canUseStorage()) {
                localStorage.removeItem('tas_maintenance_active');
                localStorage.removeItem('tas_maintenance_start');
                console.log('🧹 Estado de mantenimiento limpiado manualmente');
            }
        }
    };
    
    console.log('🔧 TAS Command Service cargado. Usa window.debugTAS para testing.');
}