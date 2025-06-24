// deviceIdentifier.js - Generación de fingerprint y gestión de configuración

/**
 * Genera un fingerprint único del dispositivo basado en características del navegador y hardware
 */
export async function generateDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Terminal fingerprint', 2, 2);
    const canvasFingerprint = canvas.toDataURL();

    const screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
    };

    const navigatorInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
    };

    const timezoneOffset = new Date().getTimezoneOffset();

    let webglInfo = 'not-supported';
    try {
        const gl = document.createElement('canvas').getContext('webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                webglInfo = {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(
                        debugInfo.UNMASKED_RENDERER_WEBGL
                    ),
                };
            }
        }
    } catch (e) {
        // Silently fail
    }

    // Combinar todas las características
    const fingerprintData = {
        canvas: canvasFingerprint,
        screen: screenInfo,
        navigator: navigatorInfo,
        timezone: timezoneOffset,
        webgl: webglInfo,
        timestamp: Date.now(),
    };

    // Generar hash del fingerprint
    const fingerprintString = JSON.stringify(fingerprintData);
    const hash = await hashString(fingerprintString);

    // Generar ID más legible
    const terminalId = `TAS_${hash.substring(0, 8).toUpperCase()}`;

    console.log('🔍 Device fingerprint generated:', terminalId);

    return terminalId;
}

/**
 * Genera hash SHA-256 de un string
 */
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Obtiene la configuración de la terminal desde localStorage
 */
export function getTerminalConfig() {
    try {
        const config = localStorage.getItem('terminal_config');
        return config ? JSON.parse(config) : null;
    } catch (error) {
        console.error('Error loading terminal config:', error);
        return null;
    }
}

/**
 * Guarda la configuración de la terminal en localStorage
 */
export function saveTerminalConfig(config) {
    try {
        const configToSave = {
            ...config,
            lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem('terminal_config', JSON.stringify(configToSave));
        console.log('✅ Terminal config saved:', configToSave);
        return true;
    } catch (error) {
        console.error('Error saving terminal config:', error);
        return false;
    }
}

/**
 * Limpia toda la configuración de la terminal
 */
export function clearTerminalConfig() {
    try {
        localStorage.removeItem('terminal_config');
        localStorage.removeItem('terminal_setup_completed');
        console.log('🗑️ Terminal config cleared');
        return true;
    } catch (error) {
        console.error('Error clearing terminal config:', error);
        return false;
    }
}

/**
 * Verifica si la terminal está configurada completamente
 */
export function isTerminalConfigured() {
    const config = getTerminalConfig();
    return !!(
        config?.id &&
        config?.name &&
        config?.location &&
        config?.name !== `Terminal ${config.id.substring(-4)}`
    );
}

/**
 * Obtiene información del hardware del dispositivo
 */
export async function getHardwareInfo() {
    const info = {
        screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
            orientation: screen.orientation?.type || 'unknown',
        },
        navigator: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
        },
        connection: null,
        memory: null,
        storage: null,
    };

    // Información de conexión (si está disponible)
    if ('connection' in navigator) {
        info.connection = {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
        };
    }

    // Información de memoria (si está disponible)
    if ('memory' in performance) {
        info.memory = {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
    }

    // Información de almacenamiento (si está disponible)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            info.storage = {
                quota: estimate.quota,
                usage: estimate.usage,
                usageDetails: estimate.usageDetails,
            };
        } catch (error) {
            console.warn('Storage estimate not available:', error);
        }
    }

    return info;
}

/**
 * Detecta capacidades del dispositivo
 */
export function detectDeviceCapabilities() {
    const capabilities = {
        touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        webSerial: 'serial' in navigator,
        webUSB: 'usb' in navigator,
        webBluetooth: 'bluetooth' in navigator,
        geolocation: 'geolocation' in navigator,
        camera:
            'mediaDevices' in navigator &&
            'getUserMedia' in navigator.mediaDevices,
        microphone:
            'mediaDevices' in navigator &&
            'getUserMedia' in navigator.mediaDevices,
        notifications: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        webRTC: 'RTCPeerConnection' in window,
        webAssembly: 'WebAssembly' in window,
        webGL: !!document.createElement('canvas').getContext('webgl'),
        webGL2: !!document.createElement('canvas').getContext('webgl2'),
        fullscreen: 'requestFullscreen' in document.documentElement,
        vibration: 'vibrate' in navigator,
        battery: 'getBattery' in navigator,
        clipboard: 'clipboard' in navigator,
        share: 'share' in navigator,
    };

    return capabilities;
}

/**
 * Genera un reporte completo del dispositivo
 */
export async function generateDeviceReport() {
    const config = getTerminalConfig();
    const hardware = await getHardwareInfo();
    const capabilities = detectDeviceCapabilities();
    const fingerprint = await generateDeviceFingerprint();

    return {
        config,
        hardware,
        capabilities,
        fingerprint,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };
}

/**
 * Validar configuración de terminal
 */
export function validateTerminalConfig(config) {
    const errors = [];

    if (!config?.id) {
        errors.push('ID de terminal requerido');
    }

    if (!config?.name || config.name.length < 3) {
        errors.push('Nombre de terminal debe tener al menos 3 caracteres');
    }

    if (!config?.location || config.location.length < 3) {
        errors.push('Ubicación debe tener al menos 3 caracteres');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Migrar configuración antigua si existe
 */
export function migrateOldConfig() {
    try {
        // Verificar si hay configuración antigua
        const oldConfig = localStorage.getItem('tas_terminal_config');
        if (oldConfig && !getTerminalConfig()) {
            const parsed = JSON.parse(oldConfig);
            saveTerminalConfig(parsed);
            localStorage.removeItem('tas_terminal_config');
            console.log('✅ Old config migrated');
        }
    } catch (error) {
        console.warn('Migration failed:', error);
    }
}
