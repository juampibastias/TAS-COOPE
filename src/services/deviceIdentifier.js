// services/deviceIdentifier.js
export const generateDeviceFingerprint = async () => {
    try {
        const components = [];

        // Screen information
        components.push(screen.width);
        components.push(screen.height);
        components.push(screen.pixelDepth);

        // Navigator information
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(navigator.platform);
        components.push(navigator.hardwareConcurrency || 0);
        components.push(navigator.deviceMemory || 0);

        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // Canvas fingerprint
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Terminal fingerprint text', 2, 2);
        components.push(canvas.toDataURL());

        // WebGL fingerprint
        const gl = canvas.getContext('webgl');
        if (gl) {
            components.push(gl.getParameter(gl.RENDERER));
            components.push(gl.getParameter(gl.VENDOR));
        }

        // Generate hash
        const fingerprint = components.join('|');
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        return `TERM_${hashHex.substring(0, 12).toUpperCase()}`;
    } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback con timestamp
        return `TERM_${Date.now().toString(36).toUpperCase()}`;
    }
};

export const getTerminalConfig = () => {
    if (typeof window === 'undefined') return null;

    const storedId = localStorage.getItem('terminalId');
    const storedName = localStorage.getItem('terminalName');
    const storedLocation = localStorage.getItem('terminalLocation');

    return {
        id: storedId,
        name: storedName || `Terminal ${storedId?.substring(-4)}`,
        location: storedLocation || 'Sin ubicación configurada',
        url: window.location.origin,
    };
};

export const saveTerminalConfig = (config) => {
    localStorage.setItem('terminalId', config.id);
    localStorage.setItem('terminalName', config.name);
    localStorage.setItem('terminalLocation', config.location);
};
