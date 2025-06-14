// app/components/FullscreenManager.js
'use client';

import { useEffect } from 'react';

export default function FullscreenManager() {
    useEffect(() => {
        const enterFullscreen = async () => {
            try {
                if (
                    document.documentElement.requestFullscreen &&
                    !document.fullscreenElement
                ) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (error) {
                console.log('Fullscreen not supported or denied');
            }
        };

        const handleKeyDown = (e) => {
            // Bloquear F11, Escape, Alt+Tab, Ctrl+Alt+Del, etc.
            if (
                e.key === 'F11' ||
                e.key === 'Escape' ||
                (e.altKey && e.key === 'Tab') ||
                (e.ctrlKey && e.altKey && e.key === 'Delete')
            ) {
                e.preventDefault();
                return false;
            }

            // Combinación secreta para salir: Ctrl+Alt+Shift+Q
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key === 'Q') {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };

        const handleFullscreenChange = () => {
            // Re-entrar automáticamente si sale del fullscreen
            if (!document.fullscreenElement) {
                setTimeout(enterFullscreen, 500);
            }
        };

        const handleContextMenu = (e) => {
            // Bloquear menú contextual (click derecho)
            e.preventDefault();
            return false;
        };

        const handleVisibilityChange = () => {
            // Re-enfocar cuando la ventana vuelve a ser visible
            if (!document.hidden) {
                setTimeout(enterFullscreen, 500);
            }
        };

        // Entrar en fullscreen al cargar
        setTimeout(enterFullscreen, 1000);

        // Event listeners
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            );
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            );
        };
    }, []);

    return null;
}
