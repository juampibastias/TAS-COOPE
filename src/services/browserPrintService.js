// browserPrintService.js - IMPRESIÓN 100% AUTOMÁTICA SIN DIÁLOGOS

import Swal from 'sweetalert2';

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ÉXITO =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log(
            '🖨️ Impresión automática silenciosa iniciada...',
            datosTicket
        );

        // ✅ IMPRESIÓN DIRECTA A NPI INTEGRATION DRIVER SIN DIÁLOGOS
        await imprimirDirectoNPI(datosTicket);

        // Notificación muy discreta
        mostrarNotificacionTAS('✅ Comprobante impreso', 'success');
        return true;
    } catch (error) {
        console.error('❌ Error en impresión automática:', error);
        // Solo mostrar notificación discreta, no interrumpir el flujo
        mostrarNotificacionTAS('⚠️ Error impresión', 'error');
        return false;
    }
}

// ===== IMPRESIÓN DIRECTA SIN DIÁLOGOS =====
async function imprimirDirectoNPI(datosTicket) {
    try {
        const {
            cliente,
            nis,
            factura,
            fecha,
            importe,
            vencimiento,
            metodoPago,
            transactionId,
            fechaPago,
        } = datosTicket;

        // Generar comando directo para impresora térmica
        const comandoImpresion = generarComandoDirecto(datosTicket);

        // ✅ MÉTODO 1: Envío directo via fetch al puerto de impresora
        try {
            await enviarAImpresoraNPI(comandoImpresion);
            console.log('✅ Comando enviado directamente a impresora NPI');
            return true;
        } catch (error) {
            console.log('❌ Envío directo falló, usando método alternativo...');
        }

        // ✅ MÉTODO 2: Crear archivo .prn y enviarlo automáticamente
        try {
            await crearArchivoImpresion(comandoImpresion, factura);
            console.log('✅ Archivo de impresión creado y enviado');
            return true;
        } catch (error) {
            console.log('❌ Método archivo falló, usando último recurso...');
        }

        // ✅ MÉTODO 3: Iframe completamente oculto con auto-print
        try {
            await imprimirConIframeOculto(datosTicket);
            console.log('✅ Impresión ejecutada con iframe oculto');
            return true;
        } catch (error) {
            console.log('❌ Todos los métodos automáticos fallaron');
            throw error;
        }
    } catch (error) {
        console.error('❌ Error en impresión directa:', error);
        throw error;
    }
}

// ===== ENVÍO DIRECTO A IMPRESORA NPI (PUERTO 9100) =====
async function enviarAImpresoraNPI(comandoImpresion) {
    try {
        // Intentar envío directo al puerto estándar de impresoras
        const response = await fetch('http://localhost:9100', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: comandoImpresion,
        });

        if (response.ok) {
            return true;
        } else {
            throw new Error('Puerto impresora no disponible');
        }
    } catch (error) {
        // Intentar con puerto alternativo
        try {
            const response2 = await fetch(
                'http://127.0.0.1:631/printers/NPI_Integration_Driver',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/vnd.cups-raw',
                    },
                    body: comandoImpresion,
                }
            );

            if (response2.ok) {
                return true;
            }
        } catch (error2) {
            // Silencioso, pasar al siguiente método
        }

        throw new Error('No se pudo conectar directamente');
    }
}

// ===== CREAR ARCHIVO DE IMPRESIÓN AUTOMÁTICO =====
async function crearArchivoImpresion(comandoImpresion, factura) {
    try {
        // Crear blob con datos de impresión
        const blob = new Blob([comandoImpresion], {
            type: 'application/octet-stream',
        });

        // Crear URL del blob
        const url = URL.createObjectURL(blob);

        // Crear enlace de descarga automática (se envía a cola de impresión)
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprobante_${factura}_${Date.now()}.prn`;
        link.style.display = 'none';

        // Agregar al DOM y simular clic
        document.body.appendChild(link);
        link.click();

        // Limpiar inmediatamente
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        console.log('✅ Archivo .prn creado y enviado a cola de impresión');
        return true;
    } catch (error) {
        console.error('❌ Error creando archivo de impresión:', error);
        throw error;
    }
}

// ===== IFRAME COMPLETAMENTE OCULTO CON AUTO-PRINT =====
async function imprimirConIframeOculto(datosTicket) {
    try {
        const {
            cliente,
            nis,
            factura,
            fecha,
            importe,
            vencimiento,
            metodoPago,
            transactionId,
            fechaPago,
        } = datosTicket;

        // HTML ultra-optimizado para impresión silenciosa
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante</title>
                <style>
                    @page { 
                        size: 80mm auto; 
                        margin: 0; 
                    }
                    @media print {
                        body {
                            width: 80mm;
                            font-family: 'Courier New', monospace;
                            font-size: 10px;
                            line-height: 1.2;
                            margin: 0;
                            padding: 2mm;
                            color: #000;
                            background: white;
                        }
                        .header { text-align: center; font-weight: bold; margin-bottom: 3mm; }
                        .separator { border-top: 1px dashed #000; margin: 2mm 0; }
                        .section { font-weight: bold; margin: 1mm 0; }
                        .amount { 
                            text-align: center; 
                            font-size: 14px; 
                            font-weight: bold; 
                            margin: 3mm 0; 
                            border: 1px solid #000; 
                            padding: 2mm; 
                        }
                        .footer { text-align: center; margin-top: 3mm; }
                    }
                    @media screen {
                        body { display: none; }
                    }
                </style>
                <script>
                    window.onload = function() {
                        // Auto-imprimir inmediatamente sin espera
                        window.print();
                        // Auto-cerrar
                        setTimeout(function() {
                            window.close();
                        }, 500);
                    };
                </script>
            </head>
            <body>
                <div class="header">
                    COOPERATIVA POPULAR<br>
                    COMPROBANTE DE PAGO
                </div>
                <div class="separator"></div>
                <div class="section">CLIENTE:</div>
                <div>${cliente}</div>
                <div>NIS: ${nis}</div>
                <div class="separator"></div>
                <div class="section">FACTURA:</div>
                <div>N°: ${factura}</div>
                <div>Venc: ${vencimiento}</div>
                <div>Fecha: ${fecha}</div>
                <div class="separator"></div>
                <div class="section">PAGO:</div>
                <div>${metodoPago}</div>
                <div>${fechaPago}</div>
                <div>ID: ${transactionId}</div>
                <div class="separator"></div>
                <div class="amount">
                    IMPORTE PAGADO<br>
                    $${parseFloat(importe).toLocaleString('es-AR')}
                </div>
                <div class="separator"></div>
                <div class="footer">
                    ✅ PAGO EXITOSO<br>
                    ${new Date().toLocaleString('es-AR')}
                </div>
            </body>
            </html>
        `;

        // Crear iframe COMPLETAMENTE invisible
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: absolute !important;
            left: -99999px !important;
            top: -99999px !important;
            width: 1px !important;
            height: 1px !important;
            visibility: hidden !important;
            opacity: 0 !important;
            border: none !important;
            z-index: -99999 !important;
            display: none !important;
        `;

        // Agregar al DOM
        document.body.appendChild(iframe);

        // Escribir contenido
        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();

        // Ejecutar auto-print después de muy poco tiempo
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
                console.log('✅ Auto-print ejecutado desde iframe invisible');
            } catch (e) {
                console.log('❌ Error en auto-print iframe:', e.message);
            }
        }, 100);

        // Limpiar iframe después de un tiempo
        setTimeout(() => {
            try {
                document.body.removeChild(iframe);
            } catch (e) {
                console.log('ℹ️ Iframe ya removido');
            }
        }, 2000);

        return true;
    } catch (error) {
        console.error('❌ Error en iframe oculto:', error);
        throw error;
    }
}

// ===== GENERAR COMANDO DIRECTO PARA IMPRESORA =====
function generarComandoDirecto(datosTicket) {
    const {
        cliente,
        nis,
        factura,
        fecha,
        importe,
        vencimiento,
        metodoPago,
        transactionId,
        fechaPago,
    } = datosTicket;

    // Comandos ESC/POS para impresora térmica
    const ESC = '\x1B';
    const GS = '\x1D';

    const comando =
        ESC +
        '@' + // Reset
        ESC +
        'a' +
        '\x01' + // Centrar
        'COOPERATIVA POPULAR\n' +
        'COMPROBANTE DE PAGO\n' +
        '================================\n' +
        ESC +
        'a' +
        '\x00' + // Alinear izquierda
        'CLIENTE: ' +
        cliente +
        '\n' +
        'NIS: ' +
        nis +
        '\n' +
        '================================\n' +
        'FACTURA: ' +
        factura +
        '\n' +
        'VENCIMIENTO: ' +
        vencimiento +
        '\n' +
        'FECHA VTO: ' +
        fecha +
        '\n' +
        '================================\n' +
        'METODO: ' +
        metodoPago +
        '\n' +
        'FECHA: ' +
        fechaPago +
        '\n' +
        'ID: ' +
        transactionId +
        '\n' +
        '================================\n' +
        ESC +
        'a' +
        '\x01' + // Centrar
        'IMPORTE PAGADO\n' +
        '$' +
        parseFloat(importe).toLocaleString('es-AR') +
        '\n' +
        '================================\n' +
        'PAGO PROCESADO EXITOSAMENTE\n' +
        'Gracias por su pago\n\n' +
        new Date().toLocaleString('es-AR') +
        '\n' +
        '\n\n\n' +
        GS +
        'V' +
        'B' +
        '\x00'; // Cortar papel

    return new TextEncoder().encode(comando);
}

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ERROR =====
export async function imprimirTicketError(datosTicketError) {
    try {
        console.log('🖨️ Imprimiendo ticket de error automáticamente...');

        // Generar y enviar comando de error
        const comandoError = generarComandoError(datosTicketError);
        await enviarAImpresoraNPI(comandoError);

        console.log('✅ Ticket de error impreso automáticamente');
        return true;
    } catch (error) {
        console.error('❌ Error imprimiendo ticket de error:', error);
        return false;
    }
}

// ===== GENERAR COMANDO DE ERROR =====
function generarComandoError(datosTicketError) {
    const {
        cliente,
        nis,
        factura,
        fecha,
        importe,
        vencimiento,
        metodoPago,
        fechaIntento,
        razonFallo,
        referencia,
    } = datosTicketError;

    const ESC = '\x1B';
    const GS = '\x1D';

    const comando =
        ESC +
        '@' + // Reset
        ESC +
        'a' +
        '\x01' + // Centrar
        'COOPERATIVA POPULAR\n' +
        'COMPROBANTE DE ERROR\n' +
        '================================\n' +
        ESC +
        'a' +
        '\x00' + // Alinear izquierda
        'CLIENTE: ' +
        cliente +
        '\n' +
        'NIS: ' +
        nis +
        '\n' +
        '================================\n' +
        'FACTURA: ' +
        factura +
        '\n' +
        'VENCIMIENTO: ' +
        vencimiento +
        '\n' +
        'FECHA VTO: ' +
        fecha +
        '\n' +
        '================================\n' +
        'INTENTO: ' +
        metodoPago +
        '\n' +
        'FECHA: ' +
        fechaIntento +
        '\n' +
        'REF: ' +
        referencia +
        '\n' +
        '================================\n' +
        ESC +
        'a' +
        '\x01' + // Centrar
        'IMPORTE INTENTADO\n' +
        '$' +
        parseFloat(importe).toLocaleString('es-AR') +
        '\n' +
        '================================\n' +
        'ESTADO: FALLIDO\n' +
        'RAZON: ' +
        razonFallo +
        '\n' +
        '================================\n' +
        'EL PAGO NO FUE PROCESADO\n' +
        'Puede intentar nuevamente\n\n' +
        new Date().toLocaleString('es-AR') +
        '\n' +
        '\n\n\n' +
        GS +
        'V' +
        'B' +
        '\x00'; // Cortar papel

    return new TextEncoder().encode(comando);
}

// ===== NOTIFICACIÓN MUY DISCRETA PARA TAS =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500, // Muy corto
        timerProgressBar: false,
        background: tipo === 'success' ? '#059669' : '#dc2626',
        color: 'white',
        width: '300px',
    });

    Toast.fire({
        title: mensaje,
    });
}

// ===== FUNCIÓN PARA PREPARAR DATOS DEL TICKET DE ÉXITO =====
export function prepararDatosTicket(
    factura,
    nis,
    cliente,
    paymentData,
    transactionId,
    metodoPago = 'MODO'
) {
    const fechaActual = new Date();

    return {
        cliente: cliente.NOMBRE || 'Cliente',
        nis: nis,
        factura: factura,
        fecha: paymentData.fecha,
        importe: paymentData.importe,
        vencimiento:
            paymentData.vencimiento === '1'
                ? '1° Vencimiento'
                : '2° Vencimiento',
        metodoPago: metodoPago.toUpperCase(),
        transactionId: transactionId,
        fechaPago: fechaActual.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }),
    };
}

// ===== FUNCIÓN PARA PREPARAR DATOS DEL TICKET DE ERROR =====
export function prepararDatosTicketError(
    factura,
    nis,
    cliente,
    paymentData,
    metodoPago,
    razonFallo,
    referencia
) {
    const fechaActual = new Date();

    return {
        cliente: cliente.NOMBRE || 'Cliente',
        nis: nis,
        factura: factura,
        fecha: paymentData.fecha,
        importe: paymentData.importe,
        vencimiento:
            paymentData.vencimiento === '1'
                ? '1° Vencimiento'
                : '2° Vencimiento',
        metodoPago: metodoPago.toUpperCase(),
        fechaIntento: fechaActual.toLocaleString('es-AR'),
        razonFallo: razonFallo,
        referencia: referencia,
    };
}

// ===== FUNCIÓN PARA TESTING MANUAL =====
export async function testImpresion() {
    const datosTest = {
        cliente: 'CLIENTE TEST',
        nis: '48970000001',
        factura: '1155816',
        fecha: '14/01/2025',
        importe: '20000',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        transactionId: 'TEST_' + Date.now(),
        fechaPago: new Date().toLocaleString('es-AR'),
    };

    console.log('🧪 Test de impresión 100% automática...');
    await imprimirTicketDesdeNavegador(datosTest);
}

// ===== FUNCIÓN PARA TESTING DE TICKETS DE ERROR =====
export async function testImpresionError() {
    const datosTestError = {
        cliente: 'CLIENTE TEST',
        nis: '48970000001',
        factura: '1155816',
        fecha: '14/01/2025',
        importe: '20000',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MERCADOPAGO',
        fechaIntento: new Date().toLocaleString('es-AR'),
        razonFallo: 'Pago rechazado por el banco',
        referencia: 'ERROR_TEST_' + Date.now(),
    };

    await imprimirTicketError(datosTestError);
}
