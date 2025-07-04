// browserPrintService.js - Optimizado para NPI Integration Driver

import Swal from 'sweetalert2';

// Función para detectar si Web Serial API está disponible
export function isWebSerialSupported() {
    return 'serial' in navigator;
}

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ÉXITO =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log(
            '🖨️ Iniciando impresión automática con NPI Driver...',
            datosTicket
        );

        // ✅ MÉTODO PRINCIPAL: WINDOW.PRINT() OPTIMIZADO PARA NPI INTEGRATION DRIVER
        try {
            await imprimirConNPIDriver(datosTicket);
            console.log(
                '✅ Ticket impreso exitosamente con NPI Integration Driver'
            );

            // Notificación discreta para TAS
            mostrarNotificacionTAS('✅ Comprobante impreso', 'success');
            return true;
        } catch (error) {
            console.log('❌ Error con NPI Driver:', error.message);

            // Fallback: Mostrar instrucciones claras
            await mostrarInstruccionesNPI(datosTicket, error.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Error crítico en impresión:', error);
        await mostrarErrorTAS(error.message);
        return false;
    }
}

// ===== FUNCIÓN ESPECÍFICA PARA NPI INTEGRATION DRIVER =====
async function imprimirConNPIDriver(datosTicket) {
    try {
        console.log('🖨️ Imprimiendo con NPI Integration Driver...');

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

        // HTML optimizado para impresoras térmicas con NPI Driver
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante de Pago</title>
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
                            color: #000;
                        }
                        
                        .header {
                            text-align: center;
                            font-weight: bold;
                            font-size: 14px;
                            margin-bottom: 4mm;
                        }
                        
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 3mm 0;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            text-decoration: underline;
                            margin: 2mm 0 1mm 0;
                        }
                        
                        .amount {
                            text-align: center;
                            font-size: 16px;
                            font-weight: bold;
                            margin: 4mm 0;
                            border: 2px solid #000;
                            padding: 3mm;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 4mm;
                            font-weight: bold;
                        }
                        
                        .success {
                            font-weight: bold;
                        }
                    }
                    
                    @media screen {
                        body {
                            width: 350px;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            margin: 20px;
                            padding: 15px;
                            border: 1px solid #ccc;
                            background: white;
                        }
                    }
                </style>
                <script>
                    window.onload = function() {
                        // Auto-imprimir después de cargar
                        setTimeout(function() {
                            window.print();
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
                
                <div class="section-title">CLIENTE:</div>
                <div>${cliente}</div>
                <div>NIS: ${nis}</div>
                
                <div class="separator"></div>
                
                <div class="section-title">FACTURA:</div>
                <div>Numero: ${factura}</div>
                <div>Vencimiento: ${vencimiento}</div>
                <div>Fecha Vto: ${fecha}</div>
                
                <div class="separator"></div>
                
                <div class="section-title">PAGO:</div>
                <div>Metodo: ${metodoPago}</div>
                <div>Fecha: ${fechaPago}</div>
                <div>ID: ${transactionId}</div>
                
                <div class="separator"></div>
                
                <div class="amount success">
                    IMPORTE PAGADO<br>
                    $${parseFloat(importe).toLocaleString('es-AR')}
                </div>
                
                <div class="separator"></div>
                
                <div class="footer success">
                    ✅ PAGO PROCESADO EXITOSAMENTE<br>
                    Gracias por su pago<br><br>
                    ${new Date().toLocaleString('es-AR')}
                </div>
            </body>
            </html>
        `;

        // Abrir ventana optimizada para NPI Driver
        const printWindow = window.open(
            '',
            '_blank',
            'width=400,height=600,scrollbars=yes'
        );

        if (!printWindow) {
            throw new Error('No se pudo abrir ventana de impresión');
        }

        // Escribir contenido y configurar auto-impresión
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Esperar a que cargue y verificar impresión
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                try {
                    printWindow.close();
                } catch (e) {}
                reject(new Error('Timeout esperando impresión'));
            }, 10000); // 10 segundos timeout

            // Verificar cuando se ejecute la impresión
            setTimeout(() => {
                clearTimeout(timeout);
                console.log(
                    '✅ Ventana de impresión configurada para NPI Driver'
                );

                // Cerrar ventana después de un tiempo
                setTimeout(() => {
                    try {
                        printWindow.close();
                    } catch (e) {
                        console.log('ℹ️ Ventana ya cerrada');
                    }
                }, 2000);

                resolve(true);
            }, 1000);
        });
    } catch (error) {
        console.error('❌ Error en impresión con NPI Driver:', error);
        throw error;
    }
}

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ERROR =====
export async function imprimirTicketError(datosTicketError) {
    try {
        console.log(
            '🖨️ Iniciando impresión de ticket de error con NPI...',
            datosTicketError
        );

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

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante de Error</title>
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
                            color: #000;
                        }
                        
                        .header {
                            text-align: center;
                            font-weight: bold;
                            font-size: 14px;
                            margin-bottom: 4mm;
                        }
                        
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 3mm 0;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            text-decoration: underline;
                            margin: 2mm 0 1mm 0;
                        }
                        
                        .amount {
                            text-align: center;
                            font-size: 16px;
                            font-weight: bold;
                            margin: 4mm 0;
                            border: 2px solid #000;
                            padding: 3mm;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 4mm;
                            font-weight: bold;
                        }
                        
                        .error {
                            font-weight: bold;
                        }
                    }
                </style>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </head>
            <body>
                <div class="header">
                    COOPERATIVA POPULAR<br>
                    <span class="error">COMPROBANTE DE ERROR</span>
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title">CLIENTE:</div>
                <div>${cliente}</div>
                <div>NIS: ${nis}</div>
                
                <div class="separator"></div>
                
                <div class="section-title">FACTURA:</div>
                <div>Numero: ${factura}</div>
                <div>Vencimiento: ${vencimiento}</div>
                <div>Fecha Vto: ${fecha}</div>
                
                <div class="separator"></div>
                
                <div class="section-title">INTENTO DE PAGO:</div>
                <div>Metodo: ${metodoPago}</div>
                <div>Fecha: ${fechaIntento}</div>
                <div>Referencia: ${referencia}</div>
                
                <div class="separator"></div>
                
                <div class="amount error">
                    IMPORTE INTENTADO<br>
                    $${parseFloat(importe).toLocaleString('es-AR')}
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title error">ESTADO: FALLIDO</div>
                
                <div class="separator"></div>
                
                <div class="section-title">RAZÓN DEL FALLO:</div>
                <div>${razonFallo}</div>
                
                <div class="separator"></div>
                
                <div class="footer error">
                    ❌ EL PAGO NO FUE PROCESADO<br>
                    Puede intentar nuevamente<br><br>
                    Contacte servicio al cliente<br>
                    si el problema persiste<br><br>
                    ${new Date().toLocaleString('es-AR')}
                </div>
            </body>
            </html>
        `;

        // Imprimir ticket de error
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();

            setTimeout(() => {
                try {
                    printWindow.close();
                } catch (e) {}
            }, 3000);
        }

        console.log('✅ Ticket de error enviado a NPI Driver');
        return true;
    } catch (error) {
        console.error('❌ Error en impresión de ticket de error:', error);
        return false;
    }
}

// ===== MOSTRAR INSTRUCCIONES ESPECÍFICAS PARA NPI =====
async function mostrarInstruccionesNPI(datosTicket, errorMsg) {
    return Swal.fire({
        title: '🖨️ NPI Integration Driver',
        html: `
            <div style="text-align: left; padding: 20px;">
                <h3 style="color: #059669; margin-bottom: 15px;">✅ El pago fue procesado exitosamente</h3>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0;"><strong>⚠️ La impresora requiere configuración manual</strong></p>
                </div>
                
                <p><strong>Para imprimir automáticamente en próximos pagos:</strong></p>
                <ol style="margin: 15px 0; padding-left: 20px;">
                    <li>Haz clic en el botón "🖨️ CONFIGURAR IMPRESORA NPI"</li>
                    <li>Sigue las instrucciones de configuración</li>
                    <li>Selecciona "NPI Integration Driver" cuando aparezca</li>
                </ol>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>💡 Una vez configurado:</strong> Todos los pagos futuros imprimirán automáticamente
                    </p>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                    Error técnico: ${errorMsg}
                </p>
            </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#059669',
        allowOutsideClick: false,
        width: 500,
    });
}

// ===== MOSTRAR ERROR PARA TAS =====
async function mostrarErrorTAS(mensaje) {
    return Swal.fire({
        icon: 'warning',
        title: 'Problema con la impresora',
        html: `
            <div style="text-align: center; padding: 10px;">
                <p style="color: #059669; font-size: 18px; font-weight: bold; margin-bottom: 15px;">
                    ✅ El pago fue exitoso
                </p>
                <p>No se pudo imprimir automáticamente</p>
                <p style="font-size: 14px; color: #666; margin-top: 15px;">
                    Error: ${mensaje}
                </p>
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0;">Usa el botón "🖨️ CONFIGURAR IMPRESORA NPI" para configurar la impresión automática</p>
                </div>
            </div>
        `,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#059669',
        timer: 5000,
    });
}

// ===== NOTIFICACIÓN DISCRETA PARA TAS =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: tipo === 'success' ? '#059669' : '#dc2626',
        color: 'white',
    });

    Toast.fire({
        icon: tipo,
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
