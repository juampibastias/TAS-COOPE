// src/services/sharedMultiplePaymentService.js
// EXTRAER EXACTAMENTE la lógica que funciona de MultiplePaymentSelector

import Swal from 'sweetalert2';
import { imprimirTicketMultiple } from './multiplePaymentPrintService';

/**
 * ✅ FUNCIÓN PRINCIPAL - Procesar pago múltiple
 * Esta es EXACTAMENTE la lógica de MultiplePaymentSelector que funciona
 */
export const procesarPagoMultiple = async (selectedFacturas, nis, baseUrl) => {
    console.log('🚀 [SharedMultiplePayment] Iniciando pago múltiple:', {
        cantidad: selectedFacturas.length,
        nis,
        total: getTotalAmount(selectedFacturas)
    });

    // ✅ VALIDACIÓN INICIAL
    if (selectedFacturas.length === 0) {
        throw new Error('No hay vencimientos seleccionados');
    }

    // ✅ SELECCIÓN DE MÉTODO (por ahora solo MODO para testing)
    const metodoPago = await showPaymentMethodSelector();
    if (!metodoPago) {
        throw new Error('Pago cancelado por usuario');
    }

    // ✅ HACER LA LLAMADA EXACTA como MultiplePaymentSelector
    const url = metodoPago === 'mercadopago' 
        ? `${baseUrl}/api/payment-multiple`
        : `${baseUrl}/api/modo/payment-multiple`;

    console.log('📡 [SharedMultiplePayment] Llamando a:', url);
    console.log('📦 [SharedMultiplePayment] Datos enviados:', { items: selectedFacturas });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedFacturas }),
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 [SharedMultiplePayment] Respuesta recibida:', result);

    // ✅ PROCESAR RESPUESTA SEGÚN MÉTODO
    if (metodoPago === 'mercadopago') {
        return await procesarMercadoPago(result, selectedFacturas);
    } else if (metodoPago === 'modo') {
        return await procesarModo(result, selectedFacturas, baseUrl);
    }

    throw new Error('Método de pago no soportado');
};

/**
 * ✅ SELECTOR DE MÉTODO - Simplificado para testing
 */
const showPaymentMethodSelector = async () => {
    // Por ahora retornar MODO directamente para testing
    // TODO: Implementar selector real
    return 'modo';
};

/**
 * ✅ PROCESAR MERCADOPAGO
 */
const procesarMercadoPago = async (result, selectedFacturas) => {
    if (!result.init_point) {
        throw new Error('No se recibió init_point de MercadoPago');
    }
    
    console.log('🔄 [SharedMultiplePayment] Redirigiendo a MercadoPago...');
    window.location.href = result.init_point;
    
    return { success: true, metodoPago: 'mercadopago', redirected: true };
};

/**
 * ✅ PROCESAR MODO - EXACTAMENTE como MultiplePaymentSelector
 */
const procesarModo = async (result, selectedFacturas, baseUrl) => {
    if (!result.qr) {
        throw new Error('El QR de MODO no fue generado correctamente');
    }

    console.log('📱 [SharedMultiplePayment] Mostrando QR MODO...');

    // ✅ DETECTAR MOBILE (lógica exacta de MultiplePaymentSelector)
    const isMobile = /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent);

    if (isMobile && result.payment_url) {
        console.log('📱 [SharedMultiplePayment] Mobile detectado, redirigiendo...');
        window.location.href = result.payment_url;

        setTimeout(() => {
            Swal.fire({
                icon: 'info',
                title: '¿No se abrió la app de MODO?',
                text: 'Podés descargarla desde el store o intentarlo nuevamente.',
                confirmButtonText: 'Ir a MODO',
            }).then(() => {
                window.location.href = 'https://modo.com.ar';
            });
        }, 2500);

        return { success: true, metodoPago: 'modo', mobile: true };
    } else {
        // ✅ DESKTOP: Mostrar QR exacto como MultiplePaymentSelector
        console.log('🖥️ [SharedMultiplePayment] Desktop detectado, mostrando QR...');
        
        return new Promise((resolve) => {
            Swal.fire({
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <p style="margin-bottom: 15px; font-weight: bold; color: #374151; font-size: 18px;">Escaneá con tu app MODO</p>
                        <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(result.qr)}&size=280x280" 
                            alt="QR MODO" 
                            style="display: block; margin: 0 auto; border-radius: 12px; border: 3px solid #f3f4f6;" 
                        />
                        <p style="margin-top:20px; font-size:13px; text-align:center; color: #6b7280;">
                            <b>ID de transacción:</b><br>
                            <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-family: monospace;">${result.externalIntentionId}</code>
                        </p>
                        <div style="margin-top:15px; padding: 10px 20px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 8px; color: white; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9;">Total a pagar</div>
                            <div style="font-size: 22px; font-weight: bold;">${formatNumber(getTotalAmount(selectedFacturas))}</div>
                            <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">${selectedFacturas.length} vencimientos seleccionados</div>
                        </div>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
                customClass: { popup: 'rounded-2xl shadow-2xl' },
                didOpen: () => {
                    // ✅ INICIAR POLLING EXACTO como MultiplePaymentSelector
                    startMultiplePaymentPolling(result.externalIntentionId, selectedFacturas, baseUrl, resolve);
                }
            });
        });
    }
};

/**
 * ✅ POLLING MÚLTIPLE - EXACTAMENTE como MultiplePaymentSelector
 */
const startMultiplePaymentPolling = (externalId, selectedFacturas, baseUrl, resolve) => {
    console.log('🔄 [SharedMultiplePayment] Iniciando polling para:', externalId);
    
    let pollingInterval = null;
    let pollingTimeout = null;
    let alertaMostrada = false;

    const checkStatus = async () => {
        if (alertaMostrada) return;

        try {
            console.log('📡 [SharedMultiplePayment] Verificando estado de facturas...');
            let algunPagoExitoso = false;
            
            for (const item of selectedFacturas) {
                const response = await fetch(
                    `${baseUrl}/api/modo/payment-status?factura=${item.factura}&nis=${item.nis}`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    const estado = data.status;
                    const paymentId = data.payment_id;

                    console.log(`📊 [SharedMultiplePayment] Factura ${item.factura}: estado=${estado}, paymentId=${paymentId}`);

                    if (estado === 'approved' && paymentId && paymentId.includes(externalId)) {
                        console.log(`✅ [SharedMultiplePayment] Factura ${item.factura} pagada exitosamente`);
                        algunPagoExitoso = true;
                    } else if (estado === 'rejected') {
                        console.log(`❌ [SharedMultiplePayment] Factura ${item.factura} rechazada`);
                        clearInterval(pollingInterval);
                        clearTimeout(pollingTimeout);
                        alertaMostrada = true;

                        Swal.fire({
                            icon: 'error',
                            title: 'Pago Múltiple Rechazado',
                            text: 'Tu pago múltiple fue rechazado. Por favor, intentá nuevamente.',
                            confirmButtonColor: '#DC2626',
                        });
                        
                        resolve({ success: false, error: 'Pago rechazado' });
                        return;
                    }
                }
            }

            if (algunPagoExitoso) {
                console.log('🎉 [SharedMultiplePayment] ¡PAGO MÚLTIPLE EXITOSO!');
                clearInterval(pollingInterval);
                clearTimeout(pollingTimeout);
                alertaMostrada = true;

                // ✅ IMPRIMIR TICKET MÚLTIPLE
                try {
                    console.log('🖨️ [SharedMultiplePayment] Preparando impresión...');
                    const pagosExitosos = selectedFacturas.map(item => ({
                        success: true,
                        factura: item.factura,
                        vencimiento: item.tipo === '1° Vencimiento' ? '1' : '2',
                        importe: item.amount,
                        transactionId: externalId
                    }));

                    const cliente = { NOMBRE: 'Cliente' }; // TODO: obtener cliente real
                    await imprimirTicketMultiple(pagosExitosos, selectedFacturas[0].nis, cliente);
                    console.log('✅ [SharedMultiplePayment] Ticket impreso correctamente');
                } catch (printError) {
                    console.warn('⚠️ [SharedMultiplePayment] Error de impresión:', printError);
                }

                // ✅ MOSTRAR ÉXITO EXACTO como MultiplePaymentSelector
                Swal.fire({
                    icon: 'success',
                    title: 'Pago Múltiple Exitoso',
                    html: `
                        <div style="text-align: center;">
                            <p style="margin-bottom: 15px; color: #374151;">Tu pago de <b style="color: #059669;">${formatNumber(getTotalAmount(selectedFacturas))}</b> ha sido procesado correctamente.</p>
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 10px 0;">
                                <p style="margin: 0; font-size: 14px; color: #166534;">✅ Se actualizaron ${selectedFacturas.length} vencimientos</p>
                            </div>
                        </div>
                    `,
                    confirmButtonText: 'Ver mi cuenta',
                    confirmButtonColor: '#059669',
                    allowOutsideClick: false,
                }).then(() => {
                    window.location.reload();
                });

                resolve({ 
                    success: true, 
                    metodoPago: 'modo', 
                    transactionId: externalId,
                    cantidadPagos: selectedFacturas.length
                });
            }

        } catch (error) {
            console.error('❌ [SharedMultiplePayment] Error durante polling:', error);
        }
    };

    // ✅ CONFIGURAR POLLING E TIMEOUT EXACTO como MultiplePaymentSelector
    checkStatus();
    pollingInterval = setInterval(checkStatus, 3000); // 3 segundos
    pollingTimeout = setTimeout(() => {
        clearInterval(pollingInterval);
        if (!alertaMostrada) {
            alertaMostrada = true;
            console.log('⏰ [SharedMultiplePayment] Timeout alcanzado');
            
            Swal.fire({
                icon: 'warning',
                title: 'Sin respuesta de MODO',
                text: 'No se pudo confirmar el pago en el tiempo esperado.',
                confirmButtonColor: '#F59E0B',
            });
            
            resolve({ success: false, error: 'Timeout' });
        }
    }, 120000); // 2 minutos
};

/**
 * ✅ FUNCIONES AUXILIARES - EXACTAS de MultiplePaymentSelector
 */
const getTotalAmount = (selectedFacturas) => {
    return selectedFacturas.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
};

const formatNumber = (num) => {
    const nf = new Intl.NumberFormat('es-AR');
    return '$ ' + nf.format(num);
};