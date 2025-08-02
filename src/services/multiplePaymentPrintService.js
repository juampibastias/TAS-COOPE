// multiplePaymentPrintService.js - Versión SIMPLIFICADA sin problemas VPN
// ✅ NO HAY CONEXIONES VPN DURANTE LA CARGA - Solo cuando se ejecuta

/**
 * ✅ FUNCIÓN PRINCIPAL: Imprimir ticket consolidado para múltiples pagos
 * @param {Array} pagosExitosos - Array de pagos procesados exitosamente
 * @param {string} nis - Número de NIS del cliente  
 * @param {Object} cliente - Datos del cliente
 */
export async function imprimirTicketMultiple(pagosExitosos, nis, cliente) {
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
            return { success: true, mensaje: 'Pago individual procesado' };
        }

        // ✅ GENERAR DATOS CONSOLIDADOS
        const datosTicketMultiple = generarDatosTicketMultiple(pagosExitosos, nis, cliente);
        
        console.log('📄 Datos del ticket múltiple generados:', datosTicketMultiple);

        // ✅ SOLO LOGGING POR AHORA - Sin conexiones VPN
        console.log('🖨️ [SIMULADO] Enviando ticket múltiple:', datosTicketMultiple);
        
        // TODO: Aquí irá la conexión VPN real cuando esté estable
        return { 
            success: true, 
            mensaje: 'Ticket múltiple preparado (simulado)',
            datos: datosTicketMultiple 
        };

    } catch (error) {
        console.error('❌ Error en impresión múltiple:', error);
        return { 
            success: false, 
            mensaje: `Error: ${error.message}` 
        };
    }
}

/**
 * ✅ GENERAR DATOS CONSOLIDADOS para tu servidor-simple.js
 */
function generarDatosTicketMultiple(pagosExitosos, nis, cliente) {
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
}

/**
 * ✅ FUNCIÓN AUXILIAR: Formatear importe para mostrar
 */
function formatearImporte(importe) {
    return parseFloat(importe || 0).toLocaleString('es-AR');
}

/**
 * ✅ FUNCIÓN AUXILIAR: Validar estructura de pago
 */
function validarPago(pago) {
    if (!pago || typeof pago !== 'object') {
        throw new Error('Pago inválido: no es un objeto');
    }
    
    if (!pago.factura) {
        throw new Error('Pago inválido: falta número de factura');
    }
    
    if (!pago.importe || isNaN(parseFloat(pago.importe))) {
        throw new Error(`Pago inválido: importe inválido (${pago.importe})`);
    }
    
    if (!pago.vencimiento || !['1', '2'].includes(pago.vencimiento)) {
        throw new Error(`Pago inválido: vencimiento inválido (${pago.vencimiento})`);
    }
    
    return true;
}

/**
 * ✅ FUNCIÓN DE DEBUGGING: Log detallado para troubleshooting
 */
export function debugPagosMultiples(pagosExitosos, nis, cliente) {
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
}

/**
 * ✅ VERSIÓN DE TESTING: Para probar la funcionalidad sin VPN
 */
export function testMultiplePayments() {
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
}