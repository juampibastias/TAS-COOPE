// multiplePaymentPrintService.js - Servicio optimizado para impresión de pagos múltiples

import Swal from 'sweetalert2';

/**
 * Detecta si el servidor local de impresión TAS está disponible
 */
export async function isLocalPrintServerAvailable() {
    try {
        const response = await fetch('http://localhost:9100/estado', {
            method: 'GET',
            timeout: 2000
        });
        return response.ok;
    } catch (error) {
        console.log('🖨️ Servidor local no disponible:', error.message);
        return false;
    }
}

/**
 * Prepara los datos para un ticket de pago múltiple
 */
export function prepararDatosTicketMultiple(selectedItems, nis, clienteNombre, metodoPago, transactionId) {
    const ahora = new Date();
    const totalImporte = selectedItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    
    // Agrupar por factura para el detalle
    const facturaGroups = {};
    selectedItems.forEach(item => {
        if (!facturaGroups[item.factura]) {
            facturaGroups[item.factura] = [];
        }
        facturaGroups[item.factura].push(item);
    });

    // Generar detalle de facturas
    const detalleFacturas = Object.keys(facturaGroups).map(facturaNum => {
        const vencimientos = facturaGroups[facturaNum];
        const lineas = vencimientos.map(v => 
            `  ${v.tipo}: $${parseFloat(v.amount).toLocaleString()}`
        );
        return `Factura ${facturaNum}:\n${lineas.join('\n')}`;
    }).join('\n\n');

    // Generar resumen por tipo de vencimiento
    const primerosVencimientos = selectedItems.filter(item => item.tipo === '1° Vencimiento');
    const segundosVencimientos = selectedItems.filter(item => item.tipo === '2° Vencimiento');

    let resumenTipos = '';
    if (primerosVencimientos.length > 0) {
        const totalPrimeros = primerosVencimientos.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        resumenTipos += `${primerosVencimientos.length} Primeros Vencimientos: $${totalPrimeros.toLocaleString()}\n`;
    }
    if (segundosVencimientos.length > 0) {
        const totalSegundos = segundosVencimientos.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        resumenTipos += `${segundosVencimientos.length} Segundos Vencimientos: $${totalSegundos.toLocaleString()}`;
    }
    
    return {
        cliente: clienteNombre,
        nis: nis,
        factura: 'PAGO MULTIPLE',
        fecha: ahora.toLocaleDateString('es-AR'),
        importe: totalImporte.toString(),
        vencimiento: `${selectedItems.length} vencimientos`,
        metodoPago: metodoPago.toUpperCase(),
        transaccion: transactionId,
        detalleFacturas: detalleFacturas,
        resumenTipos: resumenTipos,
        cantidadFacturas: Object.keys(facturaGroups).length,
        cantidadVencimientos: selectedItems.length,
        fechaPago: ahora.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
        // Para compatibilidad con el servidor existente
        nombreCliente: clienteNombre
    };
}

/**
 * Envía el ticket al servidor local de impresión TAS
 */
export async function enviarTicketAServidorLocal(datosTicket) {
    try {
        console.log('🖨️ Enviando ticket múltiple al servidor local...', datosTicket);

        const response = await fetch('http://localhost:9100/imprimir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosTicket),
            timeout: 10000 // 10 segundos timeout
        });

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Respuesta del servidor de impresión:', result);
        
        return {
            success: true,
            message: result.mensaje || 'Ticket enviado correctamente',
            facturaProcessed: result.factura
        };
        
    } catch (error) {
        console.error('❌ Error al comunicarse con servidor local:', error);
        throw new Error(`Error de impresión: ${error.message}`);
    }
}

/**
 * Genera un ticket de respaldo usando window.print() si el servidor falla
 */
export async function generarTicketRespaldo(datosTicket) {
    try {
        console.log('🖨️ Generando ticket de respaldo con window.print()...');

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante Pago Múltiple</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    
                    @media print {
                        body {
                            width: 80mm;
                            font-family: 'Courier New', monospace;
                            font-size: 11px;
                            line-height: 1.3;
                            margin: 0;
                            padding: 3mm;
                        }
                        
                        .header {
                            text-align: center;
                            font-weight: bold;
                            font-size: 14px;
                            margin-bottom: 3mm;
                            border-bottom: 2px solid #000;
                            padding-bottom: 2mm;
                        }
                        
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 2mm 0;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            text-decoration: underline;
                            margin-top: 2mm;
                        }
                        
                        .total-amount {
                            text-align: center;
                            font-size: 16px;
                            font-weight: bold;
                            margin: 3mm 0;
                            border: 2px solid #000;
                            padding: 2mm;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 4mm;
                            font-size: 10px;
                        }
                        
                        .detail-section {
                            background-color: #f9f9f9;
                            padding: 2mm;
                            margin: 2mm 0;
                            border: 1px solid #ccc;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    COOPERATIVA POPULAR<br>
                    COMPROBANTE PAGO MÚLTIPLE
                </div>
                
                <div class="section-title">CLIENTE:</div>
                ${datosTicket.cliente}<br>
                NIS: ${datosTicket.nis}
                
                <div class="separator"></div>
                
                <div class="section-title">RESUMEN DEL PAGO:</div>
                <div class="detail-section">
                    Cantidad de facturas: ${datosTicket.cantidadFacturas}<br>
                    Cantidad de vencimientos: ${datosTicket.cantidadVencimientos}<br><br>
                    ${datosTicket.resumenTipos}
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title">DETALLE POR FACTURA:</div>
                <div class="detail-section">
                    <pre style="font-size: 9px; margin: 0; white-space: pre-wrap;">${datosTicket.detalleFacturas}</pre>
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title">INFORMACIÓN DEL PAGO:</div>
                Método: ${datosTicket.metodoPago}<br>
                Fecha: ${datosTicket.fechaPago}<br>
                ID Transacción: ${datosTicket.transaccion}
                
                <div class="separator"></div>
                
                <div class="total-amount">
                    TOTAL PAGADO<br>
                    ${parseFloat(datosTicket.importe).toLocaleString()}
                </div>
                
                <div class="separator"></div>
                
                <div class="footer">
                    ✅ PAGO MÚLTIPLE PROCESADO EXITOSAMENTE<br>
                    Gracias por su pago<br><br>
                    ${new Date().toLocaleString()}<br><br>
                    Ticket válido como comprobante de pago<br>
                    No válido como factura fiscal
                </div>
            </body>
            </html>
        `;

        // Abrir ventana de impresión
        //const printWindow = window.open('', '_blank', 'width=400,height=700');
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Esperar a que cargue y luego imprimir
        return new Promise((resolve, reject) => {
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    setTimeout(() => {
                        printWindow.close();
                        resolve(true);
                    }, 1000);
                }, 500);
            };

            printWindow.onerror = () => {
                reject(new Error('Error abriendo ventana de impresión'));
            };
        });
        
    } catch (error) {
        console.error('❌ Error en impresión de respaldo:', error);
        throw error;
    }
}

/**
 * Función principal para imprimir ticket de pago múltiple
 */
export async function imprimirTicketPagoMultiple(selectedItems, nis, clienteNombre, metodoPago, transactionId) {
    try {
        console.log('🖨️ Iniciando impresión de ticket múltiple...');
        console.log('📋 Items seleccionados:', selectedItems);

        // Preparar datos del ticket
        const datosTicket = prepararDatosTicketMultiple(
            selectedItems, 
            nis, 
            clienteNombre, 
            metodoPago, 
            transactionId
        );

        console.log('📄 Datos del ticket preparados:', datosTicket);

        // Mostrar loading discreto
        Swal.fire({
            title: '🖨️ Generando comprobante...',
            text: 'Preparando ticket de pago múltiple',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            timer: 3000,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        let impresionExitosa = false;
        let metodoUsado = '';

        // Método 1: Servidor local TAS (preferido)
        if (await isLocalPrintServerAvailable()) {
            try {
                await enviarTicketAServidorLocal(datosTicket);
                impresionExitosa = true;
                metodoUsado = 'Servidor TAS local';
                console.log('✅ Impresión exitosa con servidor local');
            } catch (error) {
                console.error('❌ Error con servidor local:', error.message);
            }
        }

        // Método 2: window.print() como respaldo
        if (!impresionExitosa) {
            try {
                await generarTicketRespaldo(datosTicket);
                impresionExitosa = true;
                metodoUsado = 'Impresión de respaldo';
                console.log('✅ Impresión exitosa con método de respaldo');
            } catch (error) {
                console.error('❌ Error con método de respaldo:', error.message);
            }
        }

        // Cerrar loading y mostrar resultado
        Swal.close();

        if (impresionExitosa) {
            // Success toast - no bloquear flujo
            return {
                success: true,
                message: `Comprobante enviado (${metodoUsado})`,
                totalAmount: parseFloat(datosTicket.importe),
                itemCount: selectedItems.length
            };
        } else {
            throw new Error('No se pudo imprimir con ningún método disponible');
        }

    } catch (error) {
        console.error('❌ Error en impresión múltiple:', error);
        
        // Error toast - no bloquear flujo principal
        Swal.fire({
            icon: 'warning',
            title: 'Error de impresión',
            html: `
                <p>No se pudo imprimir automáticamente.</p>
                <p><strong>El pago múltiple fue exitoso.</strong></p>
                <br>
                <p><small>El comprobante puede consultarse en su cuenta online.</small></p>
            `,
            timer: 4000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });

        return {
            success: false,
            error: error.message,
            paymentProcessed: true // El pago sí se procesó, solo falló la impresión
        };
    }
}

/**
 * Función para testing manual de impresión múltiple
 */
export async function testImpresionMultiple(customItems = null) {
    const itemsTest = customItems || [
        {
            id: '1184691-1',
            nis: '7000001',
            factura: '1184691',
            vencimiento: '12/03/2025',
            amount: 82750,
            tipo: '1° Vencimiento',
            descripcion: 'Factura 1184691 - 1° Vencimiento'
        },
        {
            id: '1184691-2',
            nis: '7000001',
            factura: '1184691',
            vencimiento: '26/03/2025',
            amount: 82750,
            tipo: '2° Vencimiento',
            descripcion: 'Factura 1184691 - 2° Vencimiento'
        },
        {
            id: '1184692-1',
            nis: '7000001',
            factura: '1184692',
            vencimiento: '15/04/2025',
            amount: 95000,
            tipo: '1° Vencimiento',
            descripcion: 'Factura 1184692 - 1° Vencimiento'
        }
    ];

    console.log('🧪 Test de impresión múltiple iniciado...');

    try {
        const result = await imprimirTicketPagoMultiple(
            itemsTest,
            '7000001',
            'ABALLAY ANTONIO',
            'MODO',
            'TEST_MULTIPLE_' + Date.now()
        );

        console.log('✅ Test completado:', result);
        return result;
    } catch (error) {
        console.error('❌ Test falló:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Función para verificar configuración de impresión
 */
export async function verificarConfiguracionImpresion() {
    console.log('🔍 Verificando configuración de impresión...');
    
    const config = {
        servidorLocal: false,
        windowPrint: typeof window !== 'undefined' && 'print' in window,
        timestamp: new Date().toISOString()
    };

    // Verificar servidor local
    try {
        config.servidorLocal = await isLocalPrintServerAvailable();
        if (config.servidorLocal) {
            console.log('✅ Servidor local TAS disponible en puerto 9100');
        } else {
            console.log('⚠️ Servidor local TAS no disponible');
        }
    } catch (error) {
        console.log('❌ Error verificando servidor local:', error.message);
        config.servidorLocal = false;
    }

    console.log('📋 Configuración de impresión:', config);
    return config;
}

/**
 * Función para mostrar preview del ticket múltiple (para testing/debug)
 */
export function mostrarPreviewTicketMultiple(selectedItems, nis, clienteNombre, metodoPago) {
    const datosTicket = prepararDatosTicketMultiple(
        selectedItems, 
        nis, 
        clienteNombre, 
        metodoPago, 
        'PREVIEW_' + Date.now()
    );

    const preview = `
========================================
       COOPERATIVA POPULAR
     COMPROBANTE PAGO MÚLTIPLE
========================================

CLIENTE: ${datosTicket.cliente}
NIS: ${datosTicket.nis}

----------------------------------------
RESUMEN DEL PAGO:
Cantidad de facturas: ${datosTicket.cantidadFacturas}
Cantidad de vencimientos: ${datosTicket.cantidadVencimientos}

${datosTicket.resumenTipos}
----------------------------------------

DETALLE POR FACTURA:
${datosTicket.detalleFacturas}

----------------------------------------
INFORMACIÓN DEL PAGO:
Método: ${datosTicket.metodoPago}
Fecha: ${datosTicket.fechaPago}
ID Transacción: ${datosTicket.transaccion}
----------------------------------------

         TOTAL PAGADO
        ${parseFloat(datosTicket.importe).toLocaleString()}

========================================
✅ PAGO MÚLTIPLE PROCESADO EXITOSAMENTE
       Gracias por su pago

     ${new Date().toLocaleString()}

  Ticket válido como comprobante de pago
     No válido como factura fiscal
========================================
    `;

    console.log('📄 Preview del ticket múltiple:');
    console.log(preview);
    
    return {
        preview,
        datosTicket
    };
}

// Hacer funciones disponibles globalmente para testing en consola
if (typeof window !== 'undefined') {
    window.testImpresionMultiple = testImpresionMultiple;
    window.verificarConfiguracionImpresion = verificarConfiguracionImpresion;
    window.mostrarPreviewTicketMultiple = mostrarPreviewTicketMultiple;
    
    console.log('🧪 Funciones de testing múltiple disponibles:');
    console.log('- testImpresionMultiple(): Test completo de impresión');
    console.log('- verificarConfiguracionImpresion(): Verificar setup');
    console.log('- mostrarPreviewTicketMultiple(items, nis, cliente, metodo): Ver preview');
}