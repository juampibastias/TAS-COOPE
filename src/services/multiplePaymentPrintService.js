// src/services/multiplePaymentPrintService.js
// ✅ NUEVA EXTENSIÓN - NO TOCA EL CÓDIGO EXISTENTE

import { imprimirTicketDesdeNavegador } from './browserPrintService';

// 🎯 DETECTAR SI ES PAGO MÚLTIPLE
export const isMultiplePayment = (paymentsArray) => {
    return Array.isArray(paymentsArray) && paymentsArray.length > 1;
};

// 🎫 GENERAR TICKET CONSOLIDADO PARA MÚLTIPLES PAGOS - COMPATIBLE CON servidor-simple.js
export const prepararDatosTicketMultiple = (paymentsData, nis, cliente) => {
    const fechaActual = new Date();
    const totalImporte = paymentsData.reduce((sum, payment) => {
        return sum + parseFloat(payment.importe || 0);
    }, 0);

    // 🔥 FORMATO EXACTO QUE ESPERA TU servidor-simple.js
    return {
        // ✅ Campos que tu servidor-simple.js ya maneja:
        cliente: cliente?.NOMBRE || 'Cliente',
        nis: nis,
        factura: `MULTIPLE-${paymentsData.length}`, // Tu servidor usa datos.factura
        fecha: fechaActual.toLocaleDateString('es-AR'), // Tu servidor usa datos.fecha
        importe: totalImporte.toString(), // Tu servidor usa datos.importe
        vencimiento: `${paymentsData.length} VTO_MULTI`, // Tu servidor limpia con .replace('VTO_', '')
        metodoPago: paymentsData[0]?.metodoPago || 'MODO', // Tu servidor usa datos.metodoPago
        transaccion: `MULTI_${Date.now()}`, // Tu servidor usa datos.transaccion
        
        // 🆕 DATOS ADICIONALES PARA EL DETALLE (que tu servidor ignorará si no los usa)
        isMultiple: true,
        vencimientosDetalle: paymentsData.map(payment => ({
            factura: payment.factura,
            vencimiento: payment.vencimiento === '1' ? '1°' : '2°',
            fecha: payment.fecha,
            importe: parseFloat(payment.importe),
            transactionId: payment.transactionId || 'N/A'
        })),
        totalVencimientos: paymentsData.length,
        
        // ✅ Para mostrar detalle en el ticket (opcional)
        detalleFacturas: paymentsData.map(p => 
            `Fact: ${p.factura} (${p.vencimiento}° venc) - ${parseFloat(p.importe).toLocaleString()}`
        ).join('\n'),
        
        // Metadatos VPN (mantener compatibilidad con browserPrintService)
        viaVPN: true,
        remoteTAS: '10.10.5.25',
        terminalId: localStorage.getItem('tas_terminal_id'),
        timestamp: new Date().toISOString()
    };
};

// 🖨️ FUNCIÓN PRINCIPAL PARA IMPRIMIR MÚLTIPLES (USA LA INFRAESTRUCTURA EXISTENTE)
export const imprimirTicketMultiple = async (paymentsData, nis, cliente) => {
    try {
        console.log('🎫 Iniciando impresión de ticket múltiple:', paymentsData);

        // Preparar datos del ticket consolidado
        const datosTicketMultiple = prepararDatosTicketMultiple(paymentsData, nis, cliente);

        // 🔥 USAR LA FUNCIÓN EXISTENTE - NO TOCAR NADA
        await imprimirTicketDesdeNavegador(datosTicketMultiple);

        console.log('✅ Ticket múltiple impreso exitosamente');
        return true;

    } catch (error) {
        console.error('❌ Error al imprimir ticket múltiple:', error);
        
        // Fallback: Imprimir tickets individuales usando el sistema existente
        console.log('🔄 Fallback: Imprimiendo tickets individuales...');
        
        for (const payment of paymentsData) {
            try {
                const datosIndividual = {
                    cliente: cliente?.NOMBRE || 'Cliente',
                    nis: nis,
                    factura: payment.factura,
                    fecha: payment.fecha,
                    importe: payment.importe,
                    vencimiento: payment.vencimiento === '1' ? '1° Vencimiento' : '2° Vencimiento',
                    metodoPago: payment.metodoPago || 'MODO',
                    transactionId: payment.transactionId || `IND_${Date.now()}`,
                    fechaPago: new Date().toLocaleString('es-AR'),
                };

                // Usar sistema existente para cada ticket individual
                await imprimirTicketDesdeNavegador(datosIndividual);
                
                // Pequeña pausa entre impresiones
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (individualError) {
                console.error(`❌ Error imprimiendo ticket individual ${payment.factura}:`, individualError);
            }
        }
        
        return false;
    }
};

// 🔧 EXTENSIÓN DEL BROWSERPRINT SERVICE - SOLO PARA FORMATO MÚLTIPLE
export const generarContenidoTicketMultiple = (datosTicket) => {
    if (!datosTicket.isMultiple) {
        // Si no es múltiple, que use la función original
        return null;
    }

    // Template especial para tickets múltiples
    const template = `
================================
       COOPERATIVA POPULAR
      COMPROBANTE DE PAGO
================================

CLIENTE:
${datosTicket.cliente}
NIS: ${datosTicket.nis}
================================

🎫 PAGO MÚLTIPLE (${datosTicket.totalVencimientos} vencimientos)

${datosTicket.vencimientosDetalle.map((detalle, index) => `
FACTURA ${index + 1}:
- Número: ${detalle.factura}
- Vencimiento: ${detalle.vencimiento}
- Fecha: ${detalle.fecha}
- Importe: $${detalle.importe.toLocaleString()}
- ID: ${detalle.transactionId}
`).join('')}
================================

RESUMEN:
Método: ${datosTicket.metodoPago}
Fecha: ${datosTicket.fechaPago}
Total Vencimientos: ${datosTicket.totalVencimientos}

      IMPORTE TOTAL PAGADO
      $${parseFloat(datosTicket.importe).toLocaleString()}
================================

   PAGO PROCESADO EXITOSAMENTE
       Gracias por su pago

      ${datosTicket.fechaPago}


`;

    return template;
};

// ==============================
// 🔧 MODIFICACIÓN MÍNIMA AL TASFacturasGrid.jsx
// ==============================

// Solo agregar esta función al componente existente:
export const integrarPagoMultipleEnGrid = () => {
    // Esta función se llamaría desde TASFacturasGrid cuando detecte múltiples pagos

    const handlePagoMultiple = async (selectedVencimientos, nis, cliente) => {
        try {
            console.log('🔄 Procesando pago múltiple:', selectedVencimientos);

            // 1. Procesar cada pago usando la lógica EXISTENTE
            const results = [];
            
            for (const vencimiento of selectedVencimientos) {
                try {
                    const paymentData = {
                        factura: vencimiento.factura,
                        vencimiento: vencimiento.vencimiento.toString(),
                        fecha: vencimiento.fecha,
                        importe: vencimiento.amount.toString(),
                    };

                    // 🔥 USAR FUNCIÓN EXISTENTE - NO CAMBIAR NADA
                    await processPayment(paymentData, nis);
                    
                    results.push({ 
                        success: true, 
                        ...vencimiento,
                        transactionId: `PAY_${Date.now()}_${vencimiento.factura}`
                    });
                    
                } catch (error) {
                    console.error(`Error procesando ${vencimiento.factura}:`, error);
                    results.push({ success: false, ...vencimiento, error: error.message });
                }
            }

            // 2. Solo si todos fueron exitosos, imprimir ticket múltiple
            const exitosos = results.filter(r => r.success);
            
            if (exitosos.length === selectedVencimientos.length) {
                // Todos exitosos - imprimir ticket consolidado
                console.log('✅ Todos los pagos exitosos, imprimiendo ticket múltiple...');
                
                await imprimirTicketMultiple(exitosos, nis, cliente);
                
                Swal.fire({
                    icon: 'success',
                    title: '🎫 ¡Pagos realizados exitosamente!',
                    html: `
                        <div style="text-align: center; padding: 20px;">
                            <p style="font-size: 24px; margin-bottom: 20px; color: #059669;">
                                ${exitosos.length} vencimientos procesados
                            </p>
                            <p style="font-size: 20px; margin-bottom: 15px;">
                                Total pagado: <strong>$${exitosos.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</strong>
                            </p>
                            <p style="font-size: 18px; color: #6b7280;">
                                🖨️ Ticket múltiple impreso automáticamente
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'CONTINUAR',
                    confirmButtonColor: '#059669',
                    allowOutsideClick: false,
                }).then(() => {
                    window.location.reload();
                });
                
            } else if (exitosos.length > 0) {
                // Parcialmente exitosos - tickets individuales solo para exitosos
                console.log('⚠️ Pagos parcialmente exitosos, imprimiendo individuales...');
                
                // Imprimir solo los exitosos usando sistema existente
                for (const exitoso of exitosos) {
                    const datosIndividual = {
                        cliente: cliente?.NOMBRE || 'Cliente',
                        nis: nis,
                        factura: exitoso.factura,
                        fecha: exitoso.fecha,
                        importe: exitoso.amount.toString(),
                        vencimiento: exitoso.vencimiento === 1 ? '1° Vencimiento' : '2° Vencimiento',
                        metodoPago: 'MODO',
                        transactionId: exitoso.transactionId,
                        fechaPago: new Date().toLocaleString('es-AR'),
                    };

                    await imprimirTicketDesdeNavegador(datosIndividual);
                }
                
                Swal.fire({
                    icon: 'warning',
                    title: 'Pagos procesados parcialmente',
                    html: `
                        <div style="text-align: center; padding: 20px;">
                            <p style="font-size: 20px; color: #059669; margin-bottom: 10px;">
                                ✅ Exitosos: ${exitosos.length}
                            </p>
                            <p style="font-size: 20px; color: #dc2626; margin-bottom: 15px;">
                                ❌ Con errores: ${results.length - exitosos.length}
                            </p>
                            <p style="font-size: 16px; color: #6b7280;">
                                🖨️ Tickets impresos solo para pagos exitosos
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#059669',
                }).then(() => {
                    window.location.reload();
                });
                
            } else {
                // Todos fallaron - no imprimir nada
                console.log('❌ Todos los pagos fallaron - sin impresión');
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error en los pagos',
                    text: 'No se pudo procesar ningún pago. No se imprimió ningún ticket.',
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#dc2626',
                });
            }

        } catch (error) {
            console.error('❌ Error en proceso de pago múltiple:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error inesperado',
                text: 'Hubo un problema técnico. Inténtelo nuevamente.',
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: '#dc2626',
            });
        }
    };

    return { handlePagoMultiple };
};

// ==============================
// 🎯 EXTENSIÓN PARA BROWSERPRINT SERVICE
// ==============================

// Agregar esta función al browserPrintService existente SIN TOCAR NADA MÁS:
export const extenderBrowserPrintService = () => {
    
    // Interceptar solo si es ticket múltiple
    const originalPrepararDatos = window.prepararDatosTicketOriginal || prepararDatosTicket;
    
    window.prepararDatosTicketMultipleExtension = (datosTicket) => {
        if (datosTicket.isMultiple) {
            // Generar contenido especial para múltiples
            const contenidoEspecial = generarContenidoTicketMultiple(datosTicket);
            
            if (contenidoEspecial) {
                // Modificar solo el template, mantener toda la infraestructura VPN
                return {
                    ...datosTicket,
                    templateCustom: contenidoEspecial
                };
            }
        }
        
        // Si no es múltiple, usar función original
        return originalPrepararDatos ? originalPrepararDatos(datosTicket) : datosTicket;
    };
};

// ==============================
// 🔧 MODIFICACIÓN MÍNIMA BROWSERPRINT
// ==============================

// Solo agregar estas líneas al browserPrintService.js existente:
/*
// Al final del archivo browserPrintService.js, agregar:

// 🆕 EXTENSIÓN PARA TICKETS MÚLTIPLES - NO AFECTA FUNCIONAMIENTO ACTUAL
export const procesarTicketConExtension = async (datosTicket) => {
    // Si tiene template custom (múltiple), usar ese
    if (datosTicket.templateCustom) {
        console.log('🎫 Procesando ticket múltiple con template especial');
        
        // Usar la infraestructura existente pero con template custom
        const datosModificados = {
            ...datosTicket,
            // Mantener toda la lógica VPN existente
            contenidoPersonalizado: datosTicket.templateCustom
        };
        
        return await imprimirTicketDesdeNavegador(datosModificados);
    }
    
    // Si no, usar la función original sin cambios
    return await imprimirTicketDesdeNavegador(datosTicket);
};
*/

// ==============================
// 🎯 INTEGRACIÓN EN TASFacturasGrid - SOLO 3 LÍNEAS
// ==============================

// En el TASFacturasGrid.jsx existente, solo agregar:
/*
// Importar al inicio:
import { integrarPagoMultipleEnGrid, imprimirTicketMultiple } from '../services/multiplePaymentPrintService';

// En la función handlePagar del TAS (después de procesar múltiples pagos exitosos):
if (exitosos.length > 1) {
    await imprimirTicketMultiple(exitosos, nis, cliente);
}
*/

export default {
    isMultiplePayment,
    prepararDatosTicketMultiple,
    imprimirTicketMultiple,
    generarContenidoTicketMultiple,
    integrarPagoMultipleEnGrid,
    extenderBrowserPrintService
};