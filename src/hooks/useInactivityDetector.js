import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

export function useInactivityDetector(onLogout, inactivityTime = 60000) {
    // 1 minuto por defecto
    const timeoutRef = useRef(null);
    const warningShownRef = useRef(false);

    const resetTimer = () => {
        // Limpiar timeout anterior
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Reset warning flag
        warningShownRef.current = false;

        // Crear nuevo timeout
        timeoutRef.current = setTimeout(() => {
            if (!warningShownRef.current) {
                showInactivityWarning();
            }
        }, inactivityTime);
    };

    const showInactivityWarning = () => {
        warningShownRef.current = true;

        Swal.fire({
            title: '⏰ Sesión por vencer',
            text: 'Tu sesión expirará en 30 segundos por inactividad. ¿Deseas continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cerrar sesión',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#dc2626',
            timer: 30000, // 30 segundos para responder
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
        }).then((result) => {
            if (result.isConfirmed) {
                // Usuario eligió continuar - reiniciar timer
                resetTimer();

                Swal.fire({
                    title: '✅ Sesión extendida',
                    text: 'Tu sesión se ha extendido exitosamente.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    confirmButtonColor: '#059669',
                });
            } else {
                // Usuario eligió cerrar sesión o no respondió a tiempo
                Swal.fire({
                    title: '🔒 Sesión cerrada',
                    text: 'Tu sesión ha sido cerrada por seguridad.',
                    icon: 'info',
                    timer: 2000,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                }).then(() => {
                    onLogout();
                });
            }
        });
    };

    useEffect(() => {
        // Eventos que detectan actividad del usuario
        const events = [
            'mousedown',
            'mousemove',
            'keypress',
            'scroll',
            'touchstart',
            'click',
        ];

        // Iniciar timer al montar el componente
        resetTimer();

        // Agregar event listeners
        const handleActivity = () => {
            // Solo resetear si no se está mostrando la advertencia
            if (!warningShownRef.current) {
                resetTimer();
            }
        };

        events.forEach((event) => {
            document.addEventListener(event, handleActivity, true);
        });

        // Cleanup al desmontar
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            events.forEach((event) => {
                document.removeEventListener(event, handleActivity, true);
            });
        };
    }, [onLogout, inactivityTime]);

    // Función para limpiar manualmente (útil al salir)
    const clearInactivityTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        warningShownRef.current = false;
    };

    return { clearInactivityTimer };
}
