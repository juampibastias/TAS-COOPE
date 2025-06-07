// browserPrintService.js - Impresión térmica solo desde navegador

import Swal from 'sweetalert2';

// Función para detectar si Web Serial API está disponible
export function isWebSerialSupported() {
    return 'serial' in navigator;
}

// Función para generar comandos ESC/POS para impresoras térmicas
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

// Función para imprimir usando Web Serial API
async function imprimirConWebSerial(datosTicket) {
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

        // Generar comandos
        const comandos = generarComandosESCPOS(datosTicket);

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

// Función alternativa usando window.print() con formato térmico
async function imprimirConWindowPrint(datosTicket) {
    try {
        console.log('🖨️ Usando window.print() con formato térmico...');

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

        // Crear ventana de impresión con CSS para impresora térmica
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Ticket</title>
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
                
                <div class="amount">
                    IMPORTE PAGADO<br>
                    $${parseFloat(importe).toLocaleString()}
                </div>
                
                <div class="separator"></div>
                
                <div class="footer">
                    PAGO PROCESADO EXITOSAMENTE<br>
                    Gracias por su pago<br><br>
                    ${new Date().toLocaleString()}
                </div>
            </body>
            </html>
        `;

        // Abrir ventana de impresión
        const printWindow = window.open('', '_blank', 'width=300,height=600');
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
        console.error('❌ Error con window.print:', error);
        throw error;
    }
}

// Función principal de impresión
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Iniciando impresión desde navegador...', datosTicket);

        // Mostrar loading
        Swal.fire({
            title: '🖨️ Conectando con impresora...',
            text: 'Preparando ticket de pago',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        let impresionExitosa = false;
        let metodoUsado = '';

        // Método 1: Web Serial API (solo Chrome/Edge)
        if (isWebSerialSupported()) {
            try {
                await imprimirConWebSerial(datosTicket);
                impresionExitosa = true;
                metodoUsado = 'Web Serial API';
            } catch (error) {
                console.log('❌ Web Serial falló:', error.message);

                // Si el usuario canceló la selección de puerto, no continuar
                if (
                    error.message.includes('cancelled') ||
                    error.message.includes('aborted')
                ) {
                    Swal.close();
                    return;
                }
            }
        }

        // Método 2: window.print() como fallback
        if (!impresionExitosa) {
            try {
                await imprimirConWindowPrint(datosTicket);
                impresionExitosa = true;
                metodoUsado = 'window.print()';
            } catch (error) {
                console.log('❌ window.print() falló:', error.message);
            }
        }

        // Mostrar resultado
        if (impresionExitosa) {
            Swal.fire({
                icon: 'success',
                title: '🎫 Ticket enviado',
                text: `Comprobante enviado a impresora (${metodoUsado})`,
                timer: 3000,
                showConfirmButton: false,
            });
        } else {
            throw new Error('No se pudo imprimir el ticket');
        }
    } catch (error) {
        console.error('❌ Error en impresión:', error);

        Swal.fire({
            icon: 'warning',
            title: 'Error de impresión',
            html: `
                <p>No se pudo imprimir automáticamente.</p>
                <p><strong>El pago fue exitoso.</strong></p>
                <br>
                <p><small>Sugerencias:</small></p>
                <ul style="text-align: left; font-size: 12px;">
                    <li>Verificar que la impresora esté encendida</li>
                    <li>Usar Chrome o Edge para mejor compatibilidad</li>
                    <li>Permitir acceso a dispositivos USB</li>
                </ul>
            `,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#059669',
        });
    }
}

// Función para preparar datos del ticket (misma que antes)
export function prepararDatosTicket(
    factura,
    nis,
    cliente,
    paymentData,
    transactionId
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
        metodoPago: 'MODO',
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

// Función para testing manual
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
