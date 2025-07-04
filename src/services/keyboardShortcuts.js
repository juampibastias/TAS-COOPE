// src/services/keyboardShortcuts.js
import { getTASService } from './tasTerminalService';

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.isListening = false;
        this.pressedKeys = new Set();
    }

    initialize() {
        if (this.isListening) return;

        // Registrar atajos de teclado
        this.registerShortcuts();
        this.startListening();

        console.log('⌨️ Atajos de teclado inicializados');
    }

    registerShortcuts() {
        // Configuración de terminal
        this.shortcuts.set('ctrl+alt+shift+c', {
            description: 'Abrir configuración de terminal',
            action: () => {
                window.location.href = '/terminal-config';
            },
        });

        // Reset terminal
        this.shortcuts.set('ctrl+alt+shift+r', {
            description: 'Reset terminal completo',
            action: () => {
                if (
                    confirm(
                        '¿Resetear completamente la terminal?\n\nEsto eliminará toda la configuración local.'
                    )
                ) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload(true);
                }
            },
        });

        // Info del terminal en consola
        this.shortcuts.set('ctrl+alt+shift+i', {
            description: 'Mostrar información de terminal en consola',
            action: async () => {
                const tasService = getTASService();
                const status = tasService.getStatus();
                const { getTerminalConfig, getHardwareInfo } = await import(
                    './deviceIdentifier'
                );

                console.group('🖥️ INFORMACIÓN DE TERMINAL TAS');
                console.log('🆔 Terminal ID:', status.terminalId);
                console.log('📊 Estado:', status.status);
                console.log('🔗 Registrado:', status.isRegistered);
                console.log(
                    '❌ Fallos de conexión:',
                    status.connectionFailures
                );
                console.log('💓 Heartbeat activo:', status.isHeartbeatActive);
                console.log('⚙️ Configuración:', getTerminalConfig());
                console.log('🔧 Hardware:', await getHardwareInfo());
                console.groupEnd();
            },
        });

        // Toggle fullscreen
        this.shortcuts.set('ctrl+alt+f', {
            description: 'Toggle pantalla completa',
            action: async () => {
                try {
                    if (document.fullscreenElement) {
                        await document.exitFullscreen();
                    } else {
                        await document.documentElement.requestFullscreen();
                    }
                } catch (error) {
                    console.warn('Fullscreen no soportado:', error);
                }
            },
        });

        // Forzar fullscreen con controles
        this.shortcuts.set('ctrl+alt+shift+f', {
            description: 'Controles de pantalla completa',
            action: () => {
                const isFullscreen = !!document.fullscreenElement;
                const message = isFullscreen
                    ? '📺 Salir de pantalla completa?'
                    : '📺 Entrar en pantalla completa?';

                if (confirm(message)) {
                    if (isFullscreen) {
                        document.exitFullscreen();
                    } else {
                        document.documentElement.requestFullscreen();
                    }
                }
            },
        });

        // Modo mantenimiento manual
        this.shortcuts.set('ctrl+alt+shift+m', {
            description: 'Toggle modo mantenimiento',
            action: async () => {
                const tasService = getTASService();
                const currentStatus = tasService.getStatus();

                if (currentStatus.status === 'maintenance') {
                    await tasService.executeCommand(
                        'online',
                        'manual-' + Date.now()
                    );
                } else {
                    await tasService.executeCommand(
                        'maintenance',
                        'manual-' + Date.now()
                    );
                }
            },
        });

        // Test de impresión
        this.shortcuts.set('ctrl+alt+shift+p', {
            description: 'Test de impresión',
            action: async () => {
                try {
                    const { testImpresion } = await import(
                        './browserPrintService'
                    );
                    await testImpresion();
                } catch (error) {
                    console.error('Error en test de impresión:', error);
                }
            },
        });

        // Limpiar storage
        this.shortcuts.set('ctrl+alt+shift+l', {
            description: 'Limpiar almacenamiento local',
            action: () => {
                if (
                    confirm(
                        '¿Limpiar todo el almacenamiento local?\n\nEsto eliminará datos de sesión pero mantendrá la configuración de terminal.'
                    )
                ) {
                    // Preservar configuración de terminal
                    const { getTerminalConfig } = require('./deviceIdentifier');
                    const terminalConfig = getTerminalConfig();

                    localStorage.clear();
                    sessionStorage.clear();

                    // Restaurar configuración de terminal
                    if (terminalConfig) {
                        const {
                            saveTerminalConfig,
                        } = require('./deviceIdentifier');
                        saveTerminalConfig(terminalConfig);
                    }

                    alert(
                        '✅ Almacenamiento limpiado (configuración de terminal preservada)'
                    );
                }
            },
        });

        // Reload con cache bust
        this.shortcuts.set('ctrl+alt+shift+u', {
            description: 'Actualización forzada (hard refresh)',
            action: async () => {
                if (
                    confirm(
                        '¿Forzar actualización completa?\n\nEsto limpiará el cache y recargará la aplicación.'
                    )
                ) {
                    // Limpiar cache del service worker
                    if ('caches' in window) {
                        const cacheNames = await caches.keys();
                        await Promise.all(
                            cacheNames.map((name) => caches.delete(name))
                        );
                    }

                    // Recargar con cache bust
                    window.location.href =
                        window.location.href + '?cb=' + Date.now();
                }
            },
        });

        // Mostrar atajos disponibles
        this.shortcuts.set('ctrl+alt+shift+h', {
            description: 'Mostrar ayuda de atajos',
            action: () => {
                this.showHelp();
            },
        });

        // Emergency exit (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            this.shortcuts.set('ctrl+alt+shift+escape', {
                description: 'Salida de emergencia (solo desarrollo)',
                action: () => {
                    if (
                        confirm(
                            '🚨 SALIDA DE EMERGENCIA\n\n¿Salir del modo kiosco?'
                        )
                    ) {
                        window.location.href = '/';
                    }
                },
            });
        }
    }

    startListening() {
        if (this.isListening) return;

        this.isListening = true;

        document.addEventListener(
            'keydown',
            this.handleKeyDown.bind(this),
            true
        );
        document.addEventListener('keyup', this.handleKeyUp.bind(this), true);
    }

    stopListening() {
        this.isListening = false;
        document.removeEventListener(
            'keydown',
            this.handleKeyDown.bind(this),
            true
        );
        document.removeEventListener(
            'keyup',
            this.handleKeyUp.bind(this),
            true
        );
    }

    handleKeyDown(event) {
        this.pressedKeys.add(event.key.toLowerCase());

        const shortcut = this.buildShortcutString();
        const action = this.shortcuts.get(shortcut);

        if (action) {
            event.preventDefault();
            event.stopPropagation();

            console.log(
                `⌨️ Ejecutando atajo: ${shortcut} - ${action.description}`
            );
            action.action();

            return false;
        }
    }

    handleKeyUp(event) {
        this.pressedKeys.delete(event.key.toLowerCase());
    }

    /* buildShortcutString() {
        const keys = Array.from(this.pressedKeys).sort();

        // Ordenar modificadores primero
        const modifiers = ['ctrl', 'alt', 'shift', 'meta'];
        const sortedKeys = [];

        modifiers.forEach((mod) => {
            if (keys.includes(mod)) {
                sortedKeys.push(mod);
            }
        });

        keys.forEach((key) => {
            if (!modifiers.includes(key)) {
                sortedKeys.push(key);
            }
        });

        return sortedKeys.join('+');
    }
 */
    showHelp() {
        const shortcutsList = Array.from(this.shortcuts.entries())
            .map(([key, action]) => `${key}: ${action.description}`)
            .join('\n');

        console.group('⌨️ ATAJOS DE TECLADO DISPONIBLES');
        console.log(shortcutsList);
        console.groupEnd();

        // También mostrar en alert para fácil acceso
        alert(
            `⌨️ ATAJOS DE TECLADO DISPONIBLES:\n\n${shortcutsList.replace(
                /:/g,
                ' →'
            )}`
        );
    }

    // Método para registrar atajos dinámicos
    registerShortcut(keys, description, action) {
        this.shortcuts.set(keys.toLowerCase(), {
            description,
            action,
        });
    }

    // Método para eliminar atajos
    unregisterShortcut(keys) {
        return this.shortcuts.delete(keys.toLowerCase());
    }
}

// Instancia singleton
let keyboardShortcutsInstance = null;

export function getKeyboardShortcuts() {
    if (!keyboardShortcutsInstance) {
        keyboardShortcutsInstance = new KeyboardShortcuts();
    }
    return keyboardShortcutsInstance;
}

// Auto-inicializar en modo terminal
if (
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true'
) {
    // Inicializar después de que la página cargue
    if (document.readyState === 'complete') {
        getKeyboardShortcuts().initialize();
    } else {
        window.addEventListener('load', () => {
            getKeyboardShortcuts().initialize();
        });
    }
}

export default KeyboardShortcuts;
