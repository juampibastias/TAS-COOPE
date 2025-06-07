import Swal from 'sweetalert2';
import {
    imprimirTicketDesdeNavegador,
    prepararDatosTicket,
} from './browserPrintService';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Variables globales para el polling
let pollingInterval = null;
let pollingTimeout = null;

// Función para limpiar el polling
export const clearPolling = () => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    if (pollingTimeout) {
        clearTimeout(pollingTimeout);
        pollingTimeout = null;
    }
};

// Función para mostrar alertas de resultado con opción de impresión
const showPaymentResult = (type, title, text, showPrintInfo = false) => {
    const config = {
        success: {
            icon: 'success',
            confirmButtonColor: '#059669',
        },
        error: {
            icon: 'error',
            confirmButtonColor: '#dc2626',
        },
        warning: {
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
        },
    };

    const finalText = showPrintInfo
        ? `${text}\n\n🖨️ Imprimiendo comprobante automáticamente...`
        : text;

    return Swal.fire({
        icon: config[type].icon,
        title,
        text: finalText,
        confirmButtonText: type === 'success' ? 'Continuar' : 'Entendido',
        confirmButtonColor: config[type].confirmButtonColor,
        allowOutsideClick: false,
    });
};

// Función principal para verificar estado del pago MODO
const checkPaymentStatus = async (factura, nis, paymentIdPrevio = null) => {
    try {
        console.log(
            `📡 Polling → Verificando estado para factura: ${factura}, NIS: ${nis}`
        );

        const response = await fetch(
            `${baseUrl}/api/modo/payment-status?factura=${factura}&nis=${nis}`
        );

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        const nuevoEstado = data.status;
        const paymentIdActual = data.payment_id;

        console.log(
            '📡 Polling → Estado:',
            nuevoEstado,
            '| payment_id:',
            paymentIdActual,
            '| payment_id_previo:',
            paymentIdPrevio
        );

        return {
            status: nuevoEstado,
            paymentId: paymentIdActual,
            isNewPayment:
                paymentIdActual && paymentIdActual !== paymentIdPrevio,
        };
    } catch (error) {
        console.error('Error durante el polling del estado de pago:', error);
        return {
            status: 'error',
            error: error.message,
        };
    }
};

// Función para imprimir ticket automáticamente
const imprimirTicketAutomatico = async (
    factura,
    nis,
    cliente,
    paymentData,
    transactionId
) => {
    try {
        console.log('🖨️ Iniciando impresión automática del ticket...');

        const datosTicket = prepararDatosTicket(
            factura,
            nis,
            cliente,
            paymentData,
            transactionId
        );

        // Imprimir en paralelo (no bloquear el flujo)
        imprimirTicketDesdeNavegador(datosTicket).catch((error) => {
            console.error('Error en impresión automática:', error);
            // Mostrar notificación discreta de error de impresión
            setTimeout(() => {
                Swal.fire({
                    icon: 'warning',
                    title: 'Error de impresión',
                    text: 'No se pudo imprimir el ticket automáticamente. El pago fue exitoso.',
                    timer: 3000,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                });
            }, 2000);
        });
    } catch (printError) {
        console.error('Error preparando datos para impresión:', printError);
    }
};

// Función principal para iniciar el polling (ACTUALIZADA)
export const startPolling = (
    factura,
    nis,
    cliente = null, // ← NUEVO: datos del cliente para el ticket
    paymentData = null, // ← NUEVO: datos del pago para el ticket
    paymentIdPrevio = null,
    esSegundoVencimiento = false
) => {
    // Limpiar cualquier polling previo
    clearPolling();

    let alertaMostrada = false;

    console.log(`🚀 Iniciando polling para factura: ${factura}, NIS: ${nis}`);

    // Configurar el intervalo de polling (cada 2 segundos)
    pollingInterval = setInterval(async () => {
        // Evitar múltiples alertas
        if (alertaMostrada) return;

        const result = await checkPaymentStatus(factura, nis, paymentIdPrevio);

        if (result.status === 'approved' && result.isNewPayment) {
            // ✅ Pago exitoso
            clearPolling();
            alertaMostrada = true;

            // 🖨️ IMPRIMIR TICKET AUTOMÁTICAMENTE
            if (cliente && paymentData) {
                imprimirTicketAutomatico(
                    factura,
                    nis,
                    cliente,
                    paymentData,
                    result.paymentId
                );
            }

            await showPaymentResult(
                'success',
                '¡Pago Exitoso! 🎫',
                'Tu pago ha sido procesado correctamente.',
                true // Mostrar info de impresión
            );

            // Recargar la página para actualizar el estado
            window.location.reload();
        } else if (result.status === 'rejected') {
            // ❌ Pago rechazado
            clearPolling();
            alertaMostrada = true;

            await showPaymentResult(
                'error',
                'Pago Rechazado',
                'Tu pago fue rechazado. Por favor, intentá nuevamente con otro medio.'
            );

            window.location.reload();
        } else if (result.status === 'error') {
            // 🚨 Error en el polling
            console.error('Error en polling:', result.error);
            // No detener el polling por errores temporales, continuar intentando
        }

        // Para otros estados (pending, etc.) continuar el polling
    }, 2000); // Cada 2 segundos

    // Configurar timeout (2 minutos máximo)
    pollingTimeout = setTimeout(() => {
        if (!alertaMostrada) {
            clearPolling();
            alertaMostrada = true;

            showPaymentResult(
                'warning',
                'Sin respuesta de MODO',
                'No se pudo confirmar el pago en el tiempo esperado. Por favor, revisá tu app MODO.'
            ).then(() => {
                window.location.reload();
            });
        }
    }, 120000); // 2 minutos

    console.log('⏰ Polling iniciado - Timeout configurado para 2 minutos');
};

// Función para forzar verificación manual (útil para testing)
export const checkPaymentNow = async (factura, nis) => {
    console.log('🔍 Verificación manual del estado de pago');

    const result = await checkPaymentStatus(factura, nis);

    console.log('📊 Resultado de verificación manual:', result);

    return result;
};

// Función para obtener el estado del polling actual
export const getPollingStatus = () => {
    return {
        isActive: pollingInterval !== null,
        hasTimeout: pollingTimeout !== null,
        intervalId: pollingInterval,
        timeoutId: pollingTimeout,
    };
};

// Función para configurar el intervalo de polling (útil para testing)
export const setPollingInterval = (intervalMs = 2000) => {
    if (intervalMs < 1000) {
        console.warn('⚠️ Intervalo muy bajo, mínimo recomendado: 1000ms');
        intervalMs = 1000;
    }

    console.log(`⚙️ Intervalo de polling configurado a: ${intervalMs}ms`);
    return intervalMs;
};

// Hook de limpieza para usar en componentes React
export const usePollingCleanup = () => {
    // Esta función se puede llamar en useEffect cleanup
    return () => {
        console.log('🧹 Limpiando polling en unmount del componente');
        clearPolling();
    };
};

// 🆕 FUNCIÓN NUEVA: Para testing manual de impresión
export const testPrintTicket = async (factura, nis, cliente, paymentData) => {
    console.log('🧪 Testing impresión de ticket...');

    const mockTransactionId = 'TEST_' + Date.now();

    await imprimirTicketDesdeNavegador(
        factura,
        nis,
        cliente,
        paymentData,
        mockTransactionId
    );
};

// 🆕 FUNCIÓN NUEVA: Configurar comportamiento de impresión
export const setAutoPrintEnabled = (enabled = true) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('autoPrintEnabled', enabled.toString());
        console.log(
            `🖨️ Impresión automática ${
                enabled ? 'habilitada' : 'deshabilitada'
            }`
        );
    }
};

// 🆕 FUNCIÓN NUEVA: Verificar si la impresión automática está habilitada
export const isAutoPrintEnabled = () => {
    if (typeof window !== 'undefined') {
        const setting = localStorage.getItem('autoPrintEnabled');
        return setting !== 'false'; // Por defecto habilitada
    }
    return true;
};
