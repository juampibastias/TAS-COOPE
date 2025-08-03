// multiplePaymentPrintService.js - VERSIÓN CORREGIDA PARA NEXT.JS 15
// ✅ EXPORTS CORREGIDOS Y COMPATIBILIDAD MEJORADA

/**
 * ✅ FUNCIÓN PRINCIPAL: Imprimir ticket consolidado para múltiples pagos
 * @param {Array} pagosExitosos - Array de pagos procesados exitosamente
 * @param {string} nis - Número de NIS del cliente  
 * @param {Object} cliente - Datos del cliente
 */
export const imprimirTicketMultiple = async (pagosExitosos, nis, cliente) => {
    try {
        console.log('🖨️ Iniciando impresión de ticket múltiple:', {
            cantidad: pagosExitosos.length,
            nis,
            cliente: cliente?.NOMBRE
        });

        // ✅ VALIDACIONES BÁSICAS
        if (!pagosExitosos || !Array.isArray(pagosExitosos) || pagosExitosos.length === 0) {
            console.log('❌ No hay pagos exitosos para imprimir');
            return { success: false, mensaje: 'No hay pagos para imprimir' };
        }

        if (pagosExitosos.length === 1) {
            console.log('⚠️ Solo 1 pago - delegando al sistema individual');
            return await imprimirPagoIndividual(pagosExitosos[0], nis, cliente);
        }

        // ✅ GENERAR DATOS CONSOLIDADOS
        const datosTicketMultiple = generarDatosTicketMultiple(pagosExitosos, nis, cliente);
        
        console.log('📄 Datos del ticket múltiple generados:', datosTicketMultiple);

        // ✅ ENVIAR VIA SERVIDOR LOCAL (sin VPN por ahora)
        try {
            const response = await fetch('/api/imprimir-tas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    datos: datosTicketMultiple
                })
            });

            if (response.ok) {
                console.log('✅ Ticket múltiple enviado exitosamente');
                return { 
                    success: true, 
                    mensaje: 'Ticket múltiple impreso correctamente',
                    datos: datosTicketMultiple 
                };
            } else {
                console.log('⚠️ Error del servidor, intentando fallback...');
                return await fallbackTicketsIndividuales(pagosExitosos, nis, cliente);
            }

        } catch (error) {
            console.log('❌ Error de conexión, ejecutando fallback...');
            return await fallbackTicketsIndividuales(pagosExitosos, nis, cliente);
        }

    } catch (error) {
        console.error('❌ Error en impresión múltiple:', error);
        return { 
            success: false, 
            mensaje: `Error: ${error.message}` 
        };
    }
};

/**
 * ✅ GENERAR DATOS CONSOLIDADOS para tu servidor-simple.js
 */
const generarDatosTicketMultiple = (pagosExitosos, nis, cliente) => {
    // ✅ CALCULAR TOTALES
    const totalImporte = pagosExitosos.reduce((sum, pago) => {
        return sum + parseFloat(pago.importe || 0);
    }, 0);

    // ✅ GENERAR ID ÚNICO PARA MÚLTIPLES
    const timestamp = Date.now();
    const transactionId = `MULTI${timestamp}`;
    
    // ✅ GENERAR DETALLE DE FACTURAS para mostrar en el ticket
    const detalleFacturas = pagosExitosos.map(pago => {
        const vencimientoTexto = pago.vencimiento === '1' ? '1° venc' : '2° venc';
        const importeFormateado = parseFloat(pago.importe).toLocaleString('es-AR');
        return `Fact: ${pago.factura} (${vencimientoTexto}) - $${importeFormateado}`;
    }).join('\n');

    // ✅ DATOS EN EL FORMATO QUE ESPERA TU servidor-simple.js
    return {
        // Datos principales (formato estándar que ya maneja tu servidor)
        cliente: cliente?.NOMBRE || 'Cliente',
        nis: nis || 'N/A',
        factura: `MULTIPLE-${pagosExitosos.length}`,           // Tu servidor verá esto
        fecha: new Date().toLocaleDateString('es-AR'),         // Fecha actual
        importe: totalImporte.toString(),                      // Total consolidado
        vencimiento: `${pagosExitosos.length} MULTI`,          // Tu servidor limpia esto
        metodoPago: 'MODO',                                    // Método de pago
        transaccion: transactionId,                           // ID único del pago múltiple
        
        // ✅ NUEVO CAMPO: Detalle de facturas individuales
        detalleFacturas: detalleFacturas,                     // Para mostrar en ticket
        
        // Metadatos adicionales
        esPagoMultiple: true,
        cantidadFacturas: pagosExitosos.length,
        fechaHora: new Date().toISOString()
    };
};

/**
 * ✅ IMPRIMIR PAGO INDIVIDUAL usando tu sistema actual
 */
const imprimirPagoIndividual = async (pago, nis, cliente) => {
    try {
        // ✅ GENERAR DATOS EN FORMATO INDIVIDUAL
        const datosIndividual = {
            cliente: cliente?.NOMBRE || 'Cliente',
            nis: nis,
            factura: pago.factura,
            fecha: new Date().toLocaleDateString('es-AR'),
            importe: pago.importe.toString(),
            vencimiento: pago.vencimiento === '1' ? '1° Vencimiento' : '2° Vencimiento',
            metodoPago: 'MODO',
            transaccion: pago.transactionId || `IND_${Date.now()}`,
            fechaPago: new Date().toLocaleString('es-AR')
        };

        // ✅ USAR TU API EXISTENTE
        const response = await fetch('/api/imprimir-tas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                datos: datosIndividual
            })
        });

        if (response.ok) {
            console.log('✅ Ticket individual impreso exitosamente');
            return { success: true, mensaje: 'Ticket individual impreso' };
        } else {
            throw new Error('Error del servidor en impresión individual');
        }

    } catch (error) {
        console.error('❌ Error en impresión individual:', error);
        return { success: false, mensaje: `Error individual: ${error.message}` };
    }
};

/**
 * ✅ FALLBACK: Usar tu sistema actual para tickets individuales
 */
const fallbackTicketsIndividuales = async (pagosExitosos, nis, cliente) => {
    console.log('🔄 Ejecutando fallback: imprimiendo tickets individuales...');
    
    const resultados = [];
    
    for (const pago of pagosExitosos) {
        try {
            const resultado = await imprimirPagoIndividual(pago, nis, cliente);
            resultados.push({
                factura: pago.factura,
                success: resultado.success,
                mensaje: resultado.mensaje
            });
        } catch (error) {
            console.error(`❌ Error en fallback para factura ${pago.factura}:`, error);
            resultados.push({
                factura: pago.factura,
                success: false,
                mensaje: error.message
            });
        }
    }
    
    const exitosos = resultados.filter(r => r.success).length;
    
    return {
        success: exitosos > 0,
        mensaje: `Fallback completado: ${exitosos}/${pagosExitosos.length} tickets impresos`,
        resultados: resultados
    };
};

/**
 * ✅ FUNCIÓN DE DEBUGGING: Log detallado para troubleshooting
 */
export const debugPagosMultiples = (pagosExitosos, nis, cliente) => {
    console.group('🔍 DEBUG: Pagos Múltiples');
    console.log('📊 Cantidad de pagos:', pagosExitosos?.length);
    console.log('👤 Cliente:', cliente);
    console.log('🏠 NIS:', nis);
    
    if (pagosExitosos && Array.isArray(pagosExitosos)) {
        pagosExitosos.forEach((pago, index) => {
            console.log(`📄 Pago ${index + 1}:`, {
                factura: pago.factura,
                vencimiento: pago.vencimiento,
                importe: pago.importe,
                transactionId: pago.transactionId
            });
        });
        
        const total = pagosExitosos.reduce((sum, p) => sum + parseFloat(p.importe || 0), 0);
        console.log('💰 Total:', total.toLocaleString('es-AR'));
    }
    
    console.groupEnd();
};

/**
 * ✅ VERSIÓN DE TESTING: Para probar la funcionalidad
 */
export const testMultiplePayments = () => {
    const pagosTest = [
        {
            factura: '1001',
            vencimiento: '1',
            importe: '150000',
            transactionId: 'TEST_1001_1'
        },
        {
            factura: '1001', 
            vencimiento: '2',
            importe: '75000',
            transactionId: 'TEST_1001_2'
        },
        {
            factura: '1002',
            vencimiento: '1', 
            importe: '200000',
            transactionId: 'TEST_1002_1'
        }
    ];

    const clienteTest = { NOMBRE: 'CLIENTE TEST' };
    const nisTest = '7000001';

    console.log('🧪 === TEST PAGOS MÚLTIPLES ===');
    return imprimirTicketMultiple(pagosTest, nisTest, clienteTest);
};

// ✅ EXPORT DEFAULT TAMBIÉN PARA COMPATIBILIDAD
export default {
    imprimirTicketMultiple,
    debugPagosMultiples,
    testMultiplePayments
};