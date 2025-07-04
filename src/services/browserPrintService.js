// browserPrintService.js - Impresión térmica desde navegador con soporte para tickets de error

import Swal from 'sweetalert2';

// Función para detectar si Web Serial API está disponible
export function isWebSerialSupported() {
    return 'serial' in navigator;
}

// ===== COMANDOS ESC/POS PARA TICKETS DE ÉXITO =====
function generarComandosESCPOS(datosTicket) {
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

    // Comandos ESC/POS en bytes
    const ESC = 0x1b;
    const GS = 0x1d;

    const comandos = [];

    // Función helper para agregar texto
    const addText = (text) => {
        const encoder = new TextEncoder();
        comandos.push(...encoder.encode(text));
    };

    const addCommand = (...bytes) => {
        comandos.push(...bytes);
    };

    // Reset impresora
    addCommand(ESC, 0x40);

    // Centrar texto
    addCommand(ESC, 0x61, 0x01);

    // Texto grande para header
    addCommand(ESC, 0x21, 0x38);
    addText('COOPERATIVA POPULAR\n');

    // Texto normal
    addCommand(ESC, 0x21, 0x00);
    addText('COMPROBANTE DE PAGO\n');
    addText('================================\n');

    // Alinear a la izquierda
    addCommand(ESC, 0x61, 0x00);

    // Información del cliente (negrita)
    addCommand(ESC, 0x21, 0x08);
    addText('CLIENTE:\n');
    addCommand(ESC, 0x21, 0x00);
    addText(cliente + '\n');
    addText('NIS: ' + nis + '\n');
    addText('================================\n');

    // Información de factura
    addCommand(ESC, 0x21, 0x08);
    addText('FACTURA:\n');
    addCommand(ESC, 0x21, 0x00);
    addText('Numero: ' + factura + '\n');
    addText('Vencimiento: ' + vencimiento + '\n');
    addText('Fecha Vto: ' + fecha + '\n');
    addText('================================\n');

    // Información del pago
    addCommand(ESC, 0x21, 0x08);
    addText('PAGO:\n');
    addCommand(ESC, 0x21, 0x00);
    addText('Metodo: ' + metodoPago + '\n');
    addText('Fecha: ' + fechaPago + '\n');
    addText('ID: ' + transactionId + '\n');
    addText('================================\n');

    // Centrar para importe
    addCommand(ESC, 0x61, 0x01);
    addCommand(ESC, 0x21, 0x38);
    addText('IMPORTE PAGADO\n');
    addText('$' + parseFloat(importe).toLocaleString() + '\n');

    // Texto normal
    addCommand(ESC, 0x21, 0x00);
    addText('================================\n');
    addText('PAGO PROCESADO EXITOSAMENTE\n');
    addText('Gracias por su pago\n\n');
    addText(new Date().toLocaleString() + '\n');
    addText('\n\n\n');

    // Cortar papel
    addCommand(GS, 0x56, 0x42, 0x00);

    return new Uint8Array(comandos);
}

// ===== COMANDOS ESC/POS PARA TICKETS DE ERROR =====
function generarComandosESCPOSError(datosTicketError) {
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

    // Comandos ESC/POS en bytes
    const ESC = 0x1b;
    const GS = 0x1d;

    const comandos = [];

    // Función helper para agregar texto
    const addText = (text) => {
        const encoder = new TextEncoder();
        comandos.push(...encoder.encode(text));
    };

    const addCommand = (...bytes) => {
        comandos.push(...bytes);
    };

    // Reset impresora
    addCommand(ESC, 0x40);

    // Centrar texto
    addCommand(ESC, 0x61, 0x01);

    // Texto grande para header
    addCommand(ESC, 0x21, 0x38);
    addText('COOPERATIVA POPULAR\n');

    // Texto normal
    addCommand(ESC, 0x21, 0x00);
    addText('COMPROBANTE DE ERROR\n');
    addText('================================\n');

    // Alinear a la izquierda
    addCommand(ESC, 0x61, 0x00);

    // Información del cliente (negrita)
    addCommand(ESC, 0x21, 0x08);
    addText('CLIENTE:\n');
    addCommand(ESC, 0x21, 0x00);
    addText(cliente + '\n');
    addText('NIS: ' + nis + '\n');
    addText('================================\n');

    // Información de factura
    addCommand(ESC, 0x21, 0x08);
    addText('FACTURA:\n');
    addCommand(ESC, 0x21, 0x00);
    addText('Numero: ' + factura + '\n');
    addText('Vencimiento: ' + vencimiento + '\n');
    addText('Fecha Vto: ' + fecha + '\n');
    addText('================================\n');

    // Información del intento de pago
    addCommand(ESC, 0x21, 0x08);
    addText('INTENTO DE PAGO:\n');
    addCommand(ESC, 0x21, 0x00);
    addText('Metodo: ' + metodoPago + '\n');
    addText('Fecha: ' + fechaIntento + '\n');
    addText('Referencia: ' + referencia + '\n');
    addText('================================\n');

    // Centrar para importe intentado
    addCommand(ESC, 0x61, 0x01);
    addCommand(ESC, 0x21, 0x20);
    addText('IMPORTE INTENTADO\n');
    addText('$' + parseFloat(importe).toLocaleString() + '\n');

    // Información del error
    addCommand(ESC, 0x21, 0x08);
    addText('ESTADO: FALLIDO\n');
    addCommand(ESC, 0x21, 0x00);
    addText('================================\n');

    // Alinear a la izquierda
    addCommand(ESC, 0x61, 0x00);
    addText('RAZON DEL FALLO:\n');
    addText(razonFallo + '\n');
    addText('================================\n');

    // Centrar texto final
    addCommand(ESC, 0x61, 0x01);
    addText('EL PAGO NO FUE PROCESADO\n');
    addText('Puede intentar nuevamente\n\n');
    addText('Contacte servicio al cliente\n');
    addText('si el problema persiste\n\n');
    addText(new Date().toLocaleString() + '\n');
    addText('\n\n\n');

    // Cortar papel
    addCommand(GS, 0x56, 0x42, 0x00);

    return new Uint8Array(comandos);
}

// ===== FUNCIÓN PARA IMPRIMIR CON WEB SERIAL API =====
async function imprimirConWebSerial(comandos) {
    try {
        console.log('🖨️ Intentando conectar con impresora via Web Serial...');

        // Solicitar puerto serial
        const port = await navigator.serial.requestPort({
            filters: [
                // IDs comunes de impresoras térmicas
                { usbVendorId: 0x0519, usbProductId: 0x2013 }, // TG2480-H
                { usbVendorId: 0x04b8 }, // Epson
                { usbVendorId: 0x067b }, // Otras marcas
                { usbVendorId: 0x0fe6 }, // ICS Advent
                { usbVendorId: 0x0483 }, // STMicroelectronics
            ],
        });

        // Configuración del puerto
        await port.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
        });

        console.log('✅ Puerto serial abierto');

        // Enviar comandos
        const writer = port.writable.getWriter();
        await writer.write(comandos);
        writer.releaseLock();

        // Cerrar puerto
        await port.close();

        console.log('✅ Ticket enviado a impresora');
        return true;
    } catch (error) {
        console.error('❌ Error con Web Serial:', error);
        throw error;
    }
}

// ===== FUNCIÓN PARA IMPRIMIR CON WINDOW.PRINT() - TICKETS DE ÉXITO =====
async function imprimirTicketExitoConWindowPrint(datosTicket) {
    try {
        console.log('🖨️ Usando window.print() para ticket de éxito...');

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

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Comprobante de Pago</title>
                <style>
                    @page {
                        size: 58mm auto;
                        margin: 0;
                    }
                    
                    @media print {
                        body {
                            width: 58mm;
                            font-family: 'Courier New', monospace;
                            font-size: 10px;
                            line-height: 1.2;
                            margin: 0;
                            padding: 2mm;
                        }
                        
                        .header {
                            text-align: center;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 2mm;
                        }
                        
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 2mm 0;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            text-decoration: underline;
                        }
                        
                        .amount {
                            text-align: center;
                            font-size: 14px;
                            font-weight: bold;
                            margin: 3mm 0;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 3mm;
                        }
                        
                        .success {
                            color: #059669;
                        }
                    }
                    
                    @media screen {
                        body {
                            width: 300px;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            margin: 20px;
                            padding: 10px;
                            border: 1px solid #ccc;
                        }
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
                ${cliente}<br>
                NIS: ${nis}
                
                <div class="separator"></div>
                
                <div class="section-title">FACTURA:</div>
                Numero: ${factura}<br>
                Vencimiento: ${vencimiento}<br>
                Fecha Vto: ${fecha}
                
                <div class="separator"></div>
                
                <div class="section-title">PAGO:</div>
                Metodo: ${metodoPago}<br>
                Fecha: ${fechaPago}<br>
                ID: ${transactionId}
                
                <div class="separator"></div>
                
                <div class="amount success">
                    IMPORTE PAGADO<br>
                    ${parseFloat(importe).toLocaleString()}
                </div>
                
                <div class="separator"></div>
                
                <div class="footer success">
                    ✅ PAGO PROCESADO EXITOSAMENTE<br>
                    Gracias por su pago<br><br>
                    ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        // Intentar método 1: Popup
        try {
            await ejecutarWindowPrint(printContent);
            console.log('✅ Impresión exitosa con popup');
            return true;
        } catch (popupError) {
            console.log(
                '❌ Popup falló, intentando método alternativo:',
                popupError.message
            );

            // Intentar método 2: Iframe
            try {
                await imprimirSinPopup(printContent);
                console.log('✅ Impresión exitosa con iframe');
                return true;
            } catch (iframeError) {
                console.log('❌ Iframe también falló:', iframeError.message);
                throw new Error(
                    `Ambos métodos fallaron. Popup: ${popupError.message}, Iframe: ${iframeError.message}`
                );
            }
        }
    } catch (error) {
        console.error('❌ Error con window.print para éxito:', error);
        throw error;
    }
}

// ===== FUNCIÓN PARA IMPRIMIR CON WINDOW.PRINT() - TICKETS DE ERROR =====
async function imprimirTicketErrorConWindowPrint(datosTicketError) {
    try {
        console.log('🖨️ Usando window.print() para ticket de error...');

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
                        size: 58mm auto;
                        margin: 0;
                    }
                    
                    @media print {
                        body {
                            width: 58mm;
                            font-family: 'Courier New', monospace;
                            font-size: 10px;
                            line-height: 1.2;
                            margin: 0;
                            padding: 2mm;
                        }
                        
                        .header {
                            text-align: center;
                            font-weight: bold;
                            font-size: 12px;
                            margin-bottom: 2mm;
                        }
                        
                        .separator {
                            border-top: 1px dashed #000;
                            margin: 2mm 0;
                        }
                        
                        .section-title {
                            font-weight: bold;
                            text-decoration: underline;
                        }
                        
                        .amount {
                            text-align: center;
                            font-size: 14px;
                            font-weight: bold;
                            margin: 3mm 0;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 3mm;
                        }
                        
                        .error {
                            color: #dc2626;
                        }
                        
                        .warning {
                            color: #d97706;
                        }
                    }
                    
                    @media screen {
                        body {
                            width: 300px;
                            font-family: 'Courier New', monospace;
                            font-size: 12px;
                            margin: 20px;
                            padding: 10px;
                            border: 1px solid #ccc;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    COOPERATIVA POPULAR<br>
                    <span class="error">COMPROBANTE DE ERROR</span>
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title">CLIENTE:</div>
                ${cliente}<br>
                NIS: ${nis}
                
                <div class="separator"></div>
                
                <div class="section-title">FACTURA:</div>
                Numero: ${factura}<br>
                Vencimiento: ${vencimiento}<br>
                Fecha Vto: ${fecha}
                
                <div class="separator"></div>
                
                <div class="section-title">INTENTO DE PAGO:</div>
                Metodo: ${metodoPago}<br>
                Fecha: ${fechaIntento}<br>
                Referencia: ${referencia}
                
                <div class="separator"></div>
                
                <div class="amount warning">
                    IMPORTE INTENTADO<br>
                    ${parseFloat(importe).toLocaleString()}
                </div>
                
                <div class="separator"></div>
                
                <div class="section-title error">ESTADO: FALLIDO</div>
                
                <div class="separator"></div>
                
                <div class="section-title">RAZÓN DEL FALLO:</div>
                ${razonFallo}
                
                <div class="separator"></div>
                
                <div class="footer error">
                    ❌ EL PAGO NO FUE PROCESADO<br>
                    Puede intentar nuevamente<br><br>
                    <small>Contacte servicio al cliente<br>
                    si el problema persiste</small><br><br>
                    ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        // Intentar método 1: Popup
        try {
            await ejecutarWindowPrint(printContent);
            console.log('✅ Impresión de error exitosa con popup');
            return true;
        } catch (popupError) {
            console.log(
                '❌ Popup falló para error, intentando iframe:',
                popupError.message
            );

            // Intentar método 2: Iframe
            try {
                await imprimirSinPopup(printContent);
                console.log('✅ Impresión de error exitosa con iframe');
                return true;
            } catch (iframeError) {
                console.log(
                    '❌ Iframe también falló para error:',
                    iframeError.message
                );
                throw new Error(
                    `Ambos métodos fallaron para error. Popup: ${popupError.message}, Iframe: ${iframeError.message}`
                );
            }
        }
    } catch (error) {
        console.error('❌ Error con window.print para error:', error);
        throw error;
    }
}

// ===== FUNCIÓN AUXILIAR PARA EJECUTAR WINDOW.PRINT CON IMPRESIÓN AUTOMÁTICA =====
async function ejecutarWindowPrint(printContent) {
    try {
        console.log('🖨️ Intentando abrir ventana de impresión...');

        // Intentar abrir popup
        const printWindow = window.open(
            '',
            '_blank',
            'width=1,height=1,left=9999,top=9999'
        );

        if (
            !printWindow ||
            printWindow.closed ||
            typeof printWindow.closed === 'undefined'
        ) {
            console.warn('⚠️ Popup bloqueado - usando método alternativo');
            throw new Error('Popup bloqueado por el navegador');
        }

        console.log('✅ Ventana de impresión abierta (oculta)');

        // Escribir contenido
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Esperar a que cargue completamente y ejecutar impresión automática
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                try {
                    printWindow.close();
                } catch (e) {}
                reject(new Error('Timeout esperando carga de ventana'));
            }, 3000);

            const onLoad = () => {
                clearTimeout(timeout);
                console.log(
                    '📄 Documento cargado, ejecutando impresión automática...'
                );

                // FORZAR IMPRESIÓN AUTOMÁTICA SIN DIÁLOGO
                setTimeout(() => {
                    try {
                        // Método 1: print() directo (puede mostrar diálogo)
                        printWindow.print();
                        console.log(
                            '✅ Comando print() ejecutado automáticamente'
                        );

                        // Cerrar inmediatamente sin esperar
                        setTimeout(() => {
                            try {
                                printWindow.close();
                                console.log(
                                    '✅ Ventana cerrada automáticamente'
                                );
                            } catch (e) {
                                console.log(
                                    'ℹ️ No se pudo cerrar ventana automáticamente'
                                );
                            }
                            resolve(true);
                        }, 100); // Cerrar muy rápido
                    } catch (printError) {
                        try {
                            printWindow.close();
                        } catch (e) {}
                        reject(
                            new Error(
                                `Error ejecutando print(): ${printError.message}`
                            )
                        );
                    }
                }, 100); // Ejecutar impresión muy rápido
            };

            if (printWindow.document.readyState === 'complete') {
                onLoad();
            } else {
                printWindow.onload = onLoad;
                setTimeout(onLoad, 500); // Fallback rápido
            }
        });
    } catch (error) {
        console.error('❌ Error en ejecutarWindowPrint:', error);
        throw error;
    }
}

// ===== MÉTODO ALTERNATIVO SIN POPUP - IFRAME OCULTO CON IMPRESIÓN AUTOMÁTICA =====
async function imprimirSinPopup(printContent) {
    try {
        console.log(
            '🖨️ Usando método iframe oculto con impresión automática...'
        );

        // Crear iframe COMPLETAMENTE oculto
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

        // Escribir contenido en iframe
        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(printContent);
        iframeDoc.close();

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) {}
                reject(new Error('Timeout en impresión con iframe'));
            }, 3000);

            const onLoad = () => {
                clearTimeout(timeout);
                console.log(
                    '📄 Iframe cargado, ejecutando impresión automática...'
                );

                setTimeout(() => {
                    try {
                        // IMPRESIÓN AUTOMÁTICA DESDE IFRAME
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        console.log(
                            '✅ Impresión automática ejecutada desde iframe oculto'
                        );

                        // Remover iframe inmediatamente
                        setTimeout(() => {
                            try {
                                document.body.removeChild(iframe);
                            } catch (e) {
                                console.log('ℹ️ Iframe ya removido');
                            }
                            resolve(true);
                        }, 100);
                    } catch (printError) {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {}
                        reject(
                            new Error(
                                `Error imprimiendo desde iframe: ${printError.message}`
                            )
                        );
                    }
                }, 100);
            };

            if (iframeDoc.readyState === 'complete') {
                onLoad();
            } else {
                iframe.onload = onLoad;
                setTimeout(onLoad, 500);
            }
        });
    } catch (error) {
        console.error('❌ Error en imprimirSinPopup:', error);
        throw error;
    }
}

// ===== MÉTODO DIRECTO PARA TAS - SIN VENTANAS VISIBLES =====
async function imprimirDirectoTAS(printContent) {
    try {
        console.log('🖨️ Método directo TAS - impresión silenciosa...');

        // Crear contenedor temporal completamente oculto
        const printContainer = document.createElement('div');
        printContainer.innerHTML = printContent;
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-99999px';
        printContainer.style.top = '-99999px';
        printContainer.style.width = '1px';
        printContainer.style.height = '1px';
        printContainer.style.visibility = 'hidden';
        printContainer.style.opacity = '0';
        printContainer.style.overflow = 'hidden';

        document.body.appendChild(printContainer);

        // Agregar estilos de impresión dinámicamente
        const style = document.createElement('style');
        style.textContent = `
            @media print {
                body * {
                    visibility: hidden;
                }
                .print-content, .print-content * {
                    visibility: visible;
                }
                .print-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 58mm;
                    font-family: 'Courier New', monospace;
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
        printContainer.className = 'print-content';

        // Ejecutar impresión directa
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    window.print();
                    console.log('✅ Impresión directa TAS ejecutada');

                    // Limpiar después de imprimir
                    setTimeout(() => {
                        try {
                            document.body.removeChild(printContainer);
                            document.head.removeChild(style);
                        } catch (e) {
                            console.log('ℹ️ Elementos ya removidos');
                        }
                        resolve(true);
                    }, 500);
                } catch (printError) {
                    try {
                        document.body.removeChild(printContainer);
                        document.head.removeChild(style);
                    } catch (e) {}
                    reject(
                        new Error(
                            `Error en impresión directa: ${printError.message}`
                        )
                    );
                }
            }, 100);
        });
    } catch (error) {
        console.error('❌ Error en imprimirDirectoTAS:', error);
        throw error;
    }
}

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ÉXITO =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Iniciando impresión DIRECTA para TAS...', datosTicket);

        let impresionExitosa = false;
        let metodoUsado = '';

        // ✅ MÉTODO 1: WEB SERIAL API - IMPRESIÓN DIRECTA SIN DIÁLOGOS
        if (isWebSerialSupported()) {
            try {
                console.log(
                    '🔌 Intentando impresión directa con Web Serial API...'
                );
                const comandos = generarComandosESCPOS(datosTicket);
                await imprimirConWebSerialAutomatico(comandos);
                impresionExitosa = true;
                metodoUsado = 'Web Serial API (Directo)';
                console.log('✅ ¡Impresión directa exitosa! Sin diálogos.');
            } catch (error) {
                console.log('❌ Web Serial falló:', error.message);

                // Si no fue cancelación del usuario, intentar configuración automática
                if (
                    !error.message.includes('cancelled') &&
                    !error.message.includes('aborted')
                ) {
                    try {
                        console.log(
                            '🔄 Intentando configuración automática de impresora...'
                        );
                        await configurarImpresoraAutomatica(datosTicket);
                        impresionExitosa = true;
                        metodoUsado = 'Web Serial API (Auto-configurado)';
                    } catch (autoError) {
                        console.log(
                            '❌ Auto-configuración falló:',
                            autoError.message
                        );
                    }
                }
            }
        }

        // ✅ MÉTODO 2: CONFIGURACIÓN AUTOMÁTICA DE IMPRESORA (SIN DIÁLOGOS)
        if (!impresionExitosa) {
            try {
                console.log(
                    '🖨️ Intentando configuración automática de impresora del sistema...'
                );
                await enviarAImpresoraDelSistema(datosTicket);
                impresionExitosa = true;
                metodoUsado = 'Impresora del Sistema';
                console.log(
                    '✅ Enviado a impresora del sistema automáticamente'
                );
            } catch (error) {
                console.log('❌ Impresora del sistema falló:', error.message);
            }
        }

        // ✅ MÉTODO 3: ÚLTIMO RECURSO - CON NOTIFICACIÓN CLARA
        if (!impresionExitosa) {
            console.log(
                '⚠️ Métodos automáticos fallaron - mostrando instrucciones TAS'
            );

            // Mostrar modal específico para TAS
            await mostrarInstruccionesTAS(datosTicket);
            return false; // No fue automático pero se manejó
        }

        // ✅ ÉXITO AUTOMÁTICO
        if (impresionExitosa) {
            console.log(`✅ Ticket impreso automáticamente (${metodoUsado})`);

            // Notificación MUY discreta para TAS
            mostrarNotificacionTAS('✅ Comprobante impreso', 'success');
            return true;
        }
    } catch (error) {
        console.error('❌ Error crítico en impresión TAS:', error);
        await mostrarErrorTAS(error.message);
        return false;
    }
}

// ===== IMPRESIÓN DIRECTA CON WEB SERIAL AUTOMÁTICO =====
async function imprimirConWebSerialAutomatico(comandos) {
    try {
        console.log('🔌 Conectando automáticamente con impresora térmica...');

        // Intentar conectar con puertos conocidos automáticamente
        const ports = await navigator.serial.getPorts();

        let port = null;

        if (ports.length > 0) {
            // Usar puerto ya autorizado
            port = ports[0];
            console.log('✅ Usando puerto previamente autorizado');
        } else {
            // Solicitar puerto con filtros específicos para impresoras térmicas
            console.log(
                '🔍 Solicitando puerto serial para impresora térmica...'
            );
            port = await navigator.serial.requestPort({
                filters: [
                    // Impresoras térmicas más comunes
                    { usbVendorId: 0x0519 }, // TG2480-H, Star Micronics
                    { usbVendorId: 0x04b8 }, // Epson
                    { usbVendorId: 0x067b }, // Prolific Technology
                    { usbVendorId: 0x0fe6 }, // ICS Advent
                    { usbVendorId: 0x0483 }, // STMicroelectronics
                    { usbVendorId: 0x1659 }, // Prolific
                    { usbVendorId: 0x10c4 }, // Silicon Labs
                ],
            });
        }

        if (!port) {
            throw new Error('No se pudo obtener puerto serial');
        }

        // Configurar puerto optimizado para impresoras térmicas
        await port.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
            bufferSize: 255,
        });

        console.log('✅ Puerto serial abierto - enviando datos...');

        // Enviar comandos con control de flujo
        const writer = port.writable.getWriter();

        // Enviar en chunks para evitar overflow
        const chunkSize = 64;
        for (let i = 0; i < comandos.length; i += chunkSize) {
            const chunk = comandos.slice(i, i + chunkSize);
            await writer.write(chunk);
            // Pequeña pausa entre chunks
            await new Promise((resolve) => setTimeout(resolve, 10));
        }

        writer.releaseLock();

        // Esperar un momento antes de cerrar
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Cerrar puerto
        await port.close();

        console.log('✅ Datos enviados exitosamente a impresora térmica');
        return true;
    } catch (error) {
        console.error('❌ Error en Web Serial automático:', error);
        throw error;
    }
}

// ===== CONFIGURACIÓN AUTOMÁTICA DE IMPRESORA =====
async function configurarImpresoraAutomatica(datosTicket) {
    try {
        console.log('🔧 Configurando impresora automáticamente...');

        // Crear datos en formato RAW para envío directo
        const rawData = generarDatosRAW(datosTicket);

        // Intentar envío via fetch a endpoint local de impresión
        const response = await fetch('http://localhost:9100/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: rawData,
        });

        if (response.ok) {
            console.log('✅ Enviado a servidor de impresión local');
            return true;
        } else {
            throw new Error('Servidor de impresión no disponible');
        }
    } catch (error) {
        console.log('❌ Configuración automática falló:', error.message);
        throw error;
    }
}

// ===== ENVÍO A IMPRESORA DEL SISTEMA =====
async function enviarAImpresoraDelSistema(datosTicket) {
    try {
        console.log('🖨️ Intentando envío directo a impresora del sistema...');

        // Generar contenido optimizado para impresora térmica
        const contenidoTermico = generarContenidoTermico(datosTicket);

        // Crear blob con datos binarios
        const blob = new Blob([contenidoTermico], {
            type: 'application/octet-stream',
        });

        // Intentar envío directo (esto funciona en algunos entornos TAS)
        const url = URL.createObjectURL(blob);

        // Crear enlace temporal para descarga/impresión automática
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket_${Date.now()}.prn`;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        console.log('✅ Archivo de impresión generado automáticamente');
        return true;
    } catch (error) {
        console.log('❌ Envío a impresora del sistema falló:', error.message);
        throw error;
    }
}

// ===== GENERAR DATOS RAW PARA IMPRESIÓN DIRECTA =====
function generarDatosRAW(datosTicket) {
    const comandos = generarComandosESCPOS(datosTicket);
    return comandos;
}

// ===== GENERAR CONTENIDO TÉRMICO =====
function generarContenidoTermico(datosTicket) {
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

    // Formato texto plano optimizado para impresoras térmicas
    const contenido = [
        '\x1b\x40', // Reset
        '\x1b\x61\x01', // Centrar
        'COOPERATIVA POPULAR\n',
        'COMPROBANTE DE PAGO\n',
        '================================\n',
        '\x1b\x61\x00', // Alinear izquierda
        `CLIENTE: ${cliente}\n`,
        `NIS: ${nis}\n`,
        '================================\n',
        `FACTURA: ${factura}\n`,
        `VENCIMIENTO: ${vencimiento}\n`,
        `FECHA VTO: ${fecha}\n`,
        '================================\n',
        `METODO: ${metodoPago}\n`,
        `FECHA: ${fechaPago}\n`,
        `ID: ${transactionId}\n`,
        '================================\n',
        '\x1b\x61\x01', // Centrar
        'IMPORTE PAGADO\n',
        `${parseFloat(importe).toLocaleString()}\n`,
        '================================\n',
        'PAGO PROCESADO EXITOSAMENTE\n',
        'Gracias por su pago\n\n',
        new Date().toLocaleString() + '\n',
        '\n\n\n',
        '\x1d\x56\x42\x00', // Cortar papel
    ].join('');

    return new TextEncoder().encode(contenido);
}

// ===== MOSTRAR INSTRUCCIONES PARA TAS =====
async function mostrarInstruccionesTAS(datosTicket) {
    return Swal.fire({
        title: '🖨️ Configuración de Impresora',
        html: `
            <div style="text-align: left; padding: 20px;">
                <h3 style="color: #059669; margin-bottom: 15px;">✅ El pago fue procesado exitosamente</h3>
                
                <p><strong>Para imprimir automáticamente:</strong></p>
                <ol style="margin: 15px 0; padding-left: 20px;">
                    <li>Conecte la impresora térmica por USB</li>
                    <li>Configure Chrome para permitir dispositivos USB</li>
                    <li>Autorice el acceso a la impresora</li>
                </ol>
                
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; font-size: 14px;">
                        <strong>💡 Sugerencia:</strong> La próxima transacción imprimirá automáticamente
                    </p>
                </div>
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

// ===== FUNCIÓN PRINCIPAL DE IMPRESIÓN DE TICKETS DE ERROR =====
export async function imprimirTicketError(datosTicketError) {
    try {
        console.log(
            '🖨️ Iniciando impresión de ticket de error...',
            datosTicketError
        );

        let impresionExitosa = false;
        let metodoUsado = '';

        // Método 1: Web Serial API (solo Chrome/Edge)
        if (isWebSerialSupported()) {
            try {
                const comandos = generarComandosESCPOSError(datosTicketError);
                await imprimirConWebSerial(comandos);
                impresionExitosa = true;
                metodoUsado = 'Web Serial API';
            } catch (error) {
                console.log(
                    '❌ Web Serial falló para ticket de error:',
                    error.message
                );
            }
        }

        // Método 2: window.print() como fallback
        if (!impresionExitosa) {
            try {
                await imprimirTicketErrorConWindowPrint(datosTicketError);
                impresionExitosa = true;
                metodoUsado = 'window.print()';
            } catch (error) {
                console.log(
                    '❌ window.print() falló para ticket de error:',
                    error.message
                );
            }
        }

        // Mostrar resultado
        if (impresionExitosa) {
            console.log(
                `✅ Ticket de error enviado a impresora (${metodoUsado})`
            );
        } else {
            console.warn('⚠️ No se pudo imprimir ticket de error');
        }
    } catch (error) {
        console.error('❌ Error en impresión de ticket de error:', error);
    }
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

// ===== FUNCIÓN PARA TESTING MANUAL =====
export async function testImpresion() {
    const datosTest = {
        cliente: 'ABALLAY ANTONIO',
        nis: '7000001',
        factura: '1184691',
        fecha: '12/03/2025',
        importe: '165500',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        transactionId: 'TEST_' + Date.now(),
        fechaPago: new Date().toLocaleString(),
    };

    await imprimirTicketDesdeNavegador(datosTest);
}

// ===== FUNCIÓN PARA TESTING DE TICKETS DE ERROR =====
export async function testImpresionError() {
    const datosTestError = {
        cliente: 'ABALLAY ANTONIO',
        nis: '7000001',
        factura: '1184691',
        fecha: '12/03/2025',
        importe: '165500',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MERCADOPAGO',
        fechaIntento: new Date().toLocaleString(),
        razonFallo: 'Pago rechazado por el banco',
        referencia: 'ERROR_TEST_' + Date.now(),
    };

    await imprimirTicketError(datosTestError);
}
