// browserPrintService.js - Optimizado SOLO para NPI Integration Driver usando window.print()

import Swal from 'sweetalert2';

// ===== VERIFICAR SI YA ESTÁ CONFIGURADA LA IMPRESORA =====
function estaImpresoraConfigurada() {
    try {
        const config = localStorage.getItem('tas_printer_npi_configured');
        return config === 'true';
    } catch (error) {
        console.log(
            'ℹ️ No se puede acceder a localStorage, usando configuración temporal'
        );
        return window.tasPrinterConfigured || false;
    }
}

// ===== GUARDAR CONFIGURACIÓN DE IMPRESORA =====
function guardarConfiguracionImpresora() {
    try {
        localStorage.setItem('tas_printer_npi_configured', 'true');
        localStorage.setItem('tas_printer_npi_date', new Date().toISOString());
        console.log('✅ Configuración de impresora guardada');
    } catch (error) {
        console.log('ℹ️ Guardando configuración en memoria temporal');
        window.tasPrinterConfigured = true;
    }
}

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ÉXITO =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log(
            '🖨️ Iniciando impresión con NPI Integration Driver...',
            datosTicket
        );

        // ✅ VERIFICAR SI YA ESTÁ CONFIGURADA
        if (estaImpresoraConfigurada()) {
            console.log(
                '✅ Impresora ya configurada, imprimiendo directamente...'
            );
            await imprimirConNPIDriverSilencioso(datosTicket);
            mostrarNotificacionTAS('✅ Comprobante impreso', 'success');
            return true;
        } else {
            console.log(
                '⚠️ Impresora no configurada, solicitando configuración...'
            );
            await mostrarInstruccionesNPI(
                datosTicket,
                'Impresora requiere configuración inicial'
            );
            return false;
        }
    } catch (error) {
        console.error('❌ Error en impresión:', error);
        await mostrarErrorTAS(error.message);
        return false;
    }
}

// ===== FUNCIÓN PARA IMPRESIÓN SILENCIOSA (YA CONFIGURADA) =====
async function imprimirConNPIDriverSilencioso(datosTicket) {
    try {
        console.log('🖨️ Impresión silenciosa con NPI Driver ya configurado...');

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

        // HTML optimizado para impresión automática silenciosa
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
                    }
                    
                    @media screen {
                        body { display: none; }
                    }
                </style>
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
                
                <div class="amount">
                    IMPORTE PAGADO<br>
                    $${parseFloat(importe).toLocaleString('es-AR')}
                </div>
                
                <div class="separator"></div>
                
                <div class="footer">
                    ✅ PAGO PROCESADO EXITOSAMENTE<br>
                    Gracias por su pago<br><br>
                    ${new Date().toLocaleString('es-AR')}
                </div>
            </body>
            </html>
        `;

        // ✅ MÉTODO 1: Intentar window.open() (puede fallar por popup blocker)
        try {
            const printWindow = window.open(
                '',
                '_blank',
                'width=400,height=600'
            );

            if (printWindow && !printWindow.closed) {
                console.log('✅ Ventana popup abierta exitosamente');
                printWindow.document.write(printContent);
                printWindow.document.close();

                setTimeout(() => {
                    printWindow.print();
                    setTimeout(() => {
                        try {
                            printWindow.close();
                        } catch (e) {}
                    }, 1000);
                }, 200);

                return true;
            } else {
                throw new Error('Popup bloqueado');
            }
        } catch (popupError) {
            console.log('❌ Popup bloqueado, usando iframe oculto...');

            // ✅ MÉTODO 2: Iframe oculto (más confiable)
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-99999px';
            iframe.style.top = '-99999px';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.visibility = 'hidden';
            iframe.style.opacity = '0';
            iframe.style.border = 'none';
            iframe.style.zIndex = '-9999';

            document.body.appendChild(iframe);

            const iframeDoc =
                iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(printContent);
            iframeDoc.close();

            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                    console.log('✅ Impresión ejecutada desde iframe oculto');

                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {}
                    }, 2000);
                } catch (error) {
                    console.log('❌ Error en iframe, usando método directo...');

                    // ✅ MÉTODO 3: Impresión directa (último recurso)
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) {}

                    // Crear contenedor temporal para impresión directa
                    const printDiv = document.createElement('div');
                    printDiv.innerHTML = printContent;
                    printDiv.style.position = 'absolute';
                    printDiv.style.left = '-99999px';
                    printDiv.style.top = '-99999px';
                    printDiv.style.visibility = 'hidden';
                    printDiv.className = 'temp-print-content';

                    document.body.appendChild(printDiv);

                    // Agregar estilos para impresión
                    const style = document.createElement('style');
                    style.textContent = `
                        @media print {
                            body * { visibility: hidden; }
                            .temp-print-content, .temp-print-content * { 
                                visibility: visible;
                                position: static !important;
                                left: auto !important;
                                top: auto !important;
                            }
                            .temp-print-content {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 80mm;
                                font-family: 'Courier New', monospace;
                                font-size: 11px;
                            }
                        }
                    `;
                    document.head.appendChild(style);

                    setTimeout(() => {
                        window.print();
                        console.log('✅ Impresión directa ejecutada');

                        setTimeout(() => {
                            try {
                                document.body.removeChild(printDiv);
                                document.head.removeChild(style);
                            } catch (e) {}
                        }, 1000);
                    }, 100);
                }
            }, 500);

            return true;
        }
    } catch (error) {
        console.error('❌ Error en impresión silenciosa:', error);
        throw error;
    }
}

// ===== FUNCIÓN ESPECÍFICA PARA NPI INTEGRATION DRIVER (CONFIGURACIÓN INICIAL) =====
async function imprimirConNPIDriver(datosTicket) {
    try {
        console.log(
            '🖨️ Imprimiendo con NPI Integration Driver para configuración...'
        );

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Test NPI Integration Driver</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    @media print {
                        body {
                            width: 80mm;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            margin: 0;
                            padding: 3mm;
                        }
                        .header {
                            text-align: center;
                            font-weight: bold;
                            margin-bottom: 5mm;
                        }
                        .test-info {
                            border: 1px solid #000;
                            padding: 5mm;
                            margin: 3mm 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    CONFIGURACIÓN NPI INTEGRATION DRIVER
                </div>
                <div class="test-info">
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Puerto:</strong> USB002</p>
                    <p><strong>Driver:</strong> NPI Integration Driver</p>
                    <p><strong>Estado:</strong> CONFIGURANDO</p>
                </div>
                <div style="text-align: center; margin-top: 10mm;">
                    <p>Si ves este texto impreso,</p>
                    <p>la configuración es correcta.</p>
                    <p>Los próximos pagos imprimirán automáticamente.</p>
                </div>
            </body>
            </html>
        `;

        // Abrir ventana para configuración
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Ejecutar print para configuración
        setTimeout(() => {
            printWindow.print();
        }, 500);

        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    printWindow.close();
                } catch (e) {}
                resolve(true);
            }, 2000);
        });
    } catch (error) {
        console.error('❌ Error en configuración NPI Driver:', error);
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
        title: '🖨️ Configuración de Impresora',
        html: `
            <div style="text-align: left; padding: 20px;">
                <h3 style="color: #059669; margin-bottom: 15px;">✅ El pago fue procesado exitosamente</h3>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0;"><strong>⚠️ La impresora requiere configuración</strong></p>
                </div>
                
                <p><strong>Para habilitar impresión automática:</strong></p>
                <ol style="margin: 15px 0; padding-left: 20px;">
                    <li>Haz clic en el botón <strong>"🖨️ CONFIGURAR IMPRESORA NPI"</strong></li>
                    <li>Sigue las instrucciones de configuración</li>
                    <li>Selecciona "NPI Integration Driver" cuando aparezca</li>
                    <li>Confirma que la impresión funciona</li>
                </ol>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>💡 Una vez configurado:</strong> Todos los pagos futuros imprimirán automáticamente sin diálogos
                    </p>
                </div>
                
                ${
                    errorMsg && errorMsg.includes('abrir ventana')
                        ? `
                    <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                        <p style="margin: 0; font-size: 14px;">
                            <strong>🚫 Chrome está bloqueando ventanas emergentes.</strong><br>
                            Después de configurar, la impresión usará métodos alternativos que no requieren popups.
                        </p>
                    </div>
                `
                        : ''
                }
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

// ===== FUNCIÓN PARA TESTING MANUAL - SOLO WINDOW.PRINT() =====
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

    console.log('🧪 Ejecutando test de impresión con NPI Driver...');
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
