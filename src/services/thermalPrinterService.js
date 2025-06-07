// thermalPrinterService.js - Servicio para impresión de tickets térmicos

import Swal from 'sweetalert2';

// Función para generar el contenido del ticket
function generarTicketContent(datosTicket) {
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

    // Formato ESC/POS para impresoras térmicas
    const ESC = '\x1B';
    const GS = '\x1D';

    let ticket = '';

    // Inicializar impresora
    ticket += ESC + '@'; // Reset
    ticket += ESC + 'a' + '\x01'; // Centrar texto

    // Header
    ticket += ESC + '!' + '\x38'; // Texto grande y negrita
    ticket += 'COOPERATIVA POPULAR\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += 'COMPROBANTE DE PAGO\n';
    ticket += '================================\n';

    // Información del cliente
    ticket += ESC + 'a' + '\x00'; // Alinear a la izquierda
    ticket += ESC + '!' + '\x08'; // Negrita
    ticket += 'CLIENTE:\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += cliente + '\n';
    ticket += 'NIS: ' + nis + '\n';
    ticket += '================================\n';

    // Información de la factura
    ticket += ESC + '!' + '\x08'; // Negrita
    ticket += 'FACTURA:\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += 'Numero: ' + factura + '\n';
    ticket += 'Vencimiento: ' + vencimiento + '\n';
    ticket += 'Fecha Vto: ' + fecha + '\n';
    ticket += '================================\n';

    // Información del pago
    ticket += ESC + '!' + '\x08'; // Negrita
    ticket += 'PAGO:\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += 'Metodo: ' + metodoPago + '\n';
    ticket += 'Fecha: ' + fechaPago + '\n';
    ticket += 'ID Transaccion: ' + transactionId + '\n';
    ticket += '================================\n';

    // Importe - destacado
    ticket += ESC + 'a' + '\x01'; // Centrar
    ticket += ESC + '!' + '\x38'; // Texto grande y negrita
    ticket += 'IMPORTE PAGADO\n';
    ticket += '$' + parseFloat(importe).toLocaleString() + '\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += '================================\n';

    // Footer
    ticket += ESC + 'a' + '\x01'; // Centrar
    ticket += 'PAGO PROCESADO EXITOSAMENTE\n';
    ticket += 'Gracias por su pago\n';
    ticket += '\n';
    ticket += new Date().toLocaleString() + '\n';
    ticket += '\n\n\n';

    // Cortar papel
    ticket += GS + 'V' + '\x42' + '\x00';

    return ticket;
}

// Función para imprimir usando la API Web Serial (Chrome/Edge)
async function imprimirConWebSerial(contenido) {
    try {
        // Solicitar puerto serial
        const port = await navigator.serial.requestPort({
            filters: [
                { usbVendorId: 0x0519 }, // ID común para impresoras térmicas
                { usbVendorId: 0x04b8 }, // Epson
                { usbVendorId: 0x067b }, // Otras marcas
            ],
        });

        // Abrir conexión
        await port.open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
        });

        // Escribir datos
        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(contenido));

        // Cerrar conexión
        writer.releaseLock();
        await port.close();

        return true;
    } catch (error) {
        console.error('Error con Web Serial API:', error);
        throw error;
    }
}

// Función para imprimir usando comando del sistema (Electron/Node)
async function imprimirConComando(contenido) {
    try {
        // Para Windows - buscar la impresora TG2480-H
        const printerNames = [
            'TG2480-H',
            'TG-2480H',
            'Generic / Text Only',
            'Thermal Printer',
        ];

        // Crear archivo temporal con el contenido
        const blob = new Blob([contenido], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        // Intentar imprimir usando window.print() como fallback
        const printWindow = window.open(url, '_blank');
        printWindow.onload = () => {
            printWindow.print();
            setTimeout(() => {
                printWindow.close();
                URL.revokeObjectURL(url);
            }, 1000);
        };

        return true;
    } catch (error) {
        console.error('Error al imprimir con comando:', error);
        throw error;
    }
}

// Función para imprimir directamente en puerto (si está en contexto Electron)
async function imprimirEnPuerto(contenido) {
    try {
        // Detectar puertos COM disponibles
        const puertos = ['COM1', 'COM2', 'COM3', 'COM4', 'LPT1'];

        for (const puerto of puertos) {
            try {
                // Intentar escribir al puerto usando fetch a una API local
                const response = await fetch('/api/print-ticket', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        puerto,
                        contenido,
                        impresora: 'TG2480-H',
                    }),
                });

                if (response.ok) {
                    return true;
                }
            } catch (err) {
                console.log(`Puerto ${puerto} no disponible`);
            }
        }

        throw new Error('No se encontró puerto disponible');
    } catch (error) {
        console.error('Error al imprimir en puerto:', error);
        throw error;
    }
}

// Función principal para imprimir ticket
export async function imprimirTicketTermico(datosTicket) {
    try {
        console.log('🖨️ Iniciando impresión de ticket...', datosTicket);

        // Generar contenido del ticket
        const contenido = generarTicketContent(datosTicket);

        // Mostrar loading
        Swal.fire({
            title: '🖨️ Imprimiendo ticket...',
            text: 'Generando comprobante de pago',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        let impresionExitosa = false;

        // Método 1: Web Serial API (más moderno)
        if (navigator.serial) {
            try {
                await imprimirConWebSerial(contenido);
                impresionExitosa = true;
                console.log('✅ Impresión exitosa con Web Serial API');
            } catch (error) {
                console.log(
                    '❌ Web Serial API falló, intentando método alternativo...'
                );
            }
        }

        // Método 2: API del servidor (si existe)
        if (!impresionExitosa) {
            try {
                await imprimirEnPuerto(contenido);
                impresionExitosa = true;
                console.log('✅ Impresión exitosa con API del servidor');
            } catch (error) {
                console.log(
                    '❌ API del servidor falló, intentando método de respaldo...'
                );
            }
        }

        // Método 3: Fallback - window.print()
        if (!impresionExitosa) {
            try {
                await imprimirConComando(contenido);
                impresionExitosa = true;
                console.log('✅ Impresión con método de respaldo');
            } catch (error) {
                console.log('❌ Todos los métodos de impresión fallaron');
            }
        }

        // Cerrar loading y mostrar resultado
        if (impresionExitosa) {
            Swal.fire({
                icon: 'success',
                title: '🎫 Ticket impreso',
                text: 'El comprobante se ha impreso correctamente',
                timer: 2000,
                showConfirmButton: false,
            });
        } else {
            throw new Error('No se pudo imprimir el ticket');
        }
    } catch (error) {
        console.error('❌ Error al imprimir ticket:', error);

        Swal.fire({
            icon: 'warning',
            title: 'Error de impresión',
            text: 'No se pudo imprimir el ticket automáticamente. El pago fue exitoso.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#059669',
        });
    }
}

// Función para preparar datos del ticket desde la respuesta de pago
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
