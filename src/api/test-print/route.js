// /api/test-print/route.js
// API para testing de impresión de tickets

import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();

        // Datos por defecto para testing
        const defaultData = {
            cliente: 'ABALLAY ANTONIO',
            nis: '7000001',
            factura: '1184691',
            fecha: '12/03/2025',
            importe: '165500',
            vencimiento: '1° Vencimiento',
            metodoPago: 'MODO',
            transactionId: 'TEST_' + Date.now(),
            fechaPago: new Date().toLocaleString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
        };

        // Merge con datos recibidos
        const datosTicket = { ...defaultData, ...body };

        // Validar datos requeridos
        const requiredFields = ['cliente', 'nis', 'factura', 'importe'];
        const missingFields = requiredFields.filter(
            (field) => !datosTicket[field]
        );

        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    error: 'Campos requeridos faltantes',
                    missing: missingFields,
                    example: defaultData,
                },
                { status: 400 }
            );
        }

        // Generar contenido del ticket (formato ESC/POS)
        const ticketContent = generarTicketESCPOS(datosTicket);

        // Log para debugging
        console.log('🎫 Generando ticket de prueba:', {
            cliente: datosTicket.cliente,
            factura: datosTicket.factura,
            importe: datosTicket.importe,
            transactionId: datosTicket.transactionId,
        });

        // En un entorno real, aquí enviarías a la impresora
        // Por ahora, simular diferentes escenarios

        const testMode = body.testMode || 'success';

        switch (testMode) {
            case 'success':
                return NextResponse.json({
                    success: true,
                    message: 'Ticket generado exitosamente',
                    datos: datosTicket,
                    ticketPreview: generarTicketTextoPlano(datosTicket),
                    escPosLength: ticketContent.length,
                    timestamp: new Date().toISOString(),
                });

            case 'printer_error':
                return NextResponse.json(
                    {
                        error: 'Error de impresora',
                        message:
                            'No se pudo conectar con la impresora TG2480-H',
                        datos: datosTicket,
                    },
                    { status: 500 }
                );

            case 'port_busy':
                return NextResponse.json(
                    {
                        error: 'Puerto ocupado',
                        message:
                            'La impresora está siendo utilizada por otro proceso',
                        datos: datosTicket,
                    },
                    { status: 503 }
                );

            default:
                return NextResponse.json(
                    {
                        error: 'Modo de prueba no válido',
                        validModes: ['success', 'printer_error', 'port_busy'],
                    },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('❌ Error en API de testing:', error);

        return NextResponse.json(
            {
                error: 'Error interno del servidor',
                message: error.message,
                stack:
                    process.env.NODE_ENV === 'development'
                        ? error.stack
                        : undefined,
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    // Endpoint para obtener datos de ejemplo
    const url = new URL(request.url);
    const formato = url.searchParams.get('formato') || 'json';

    const ejemploData = {
        cliente: 'ABALLAY ANTONIO',
        nis: '7000001',
        factura: '1184691',
        fecha: '12/03/2025',
        importe: '165500',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        transactionId: 'TEST_' + Date.now(),
    };

    if (formato === 'curl') {
        const curlCommand = `curl -X POST ${url.origin}/api/test-print \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(ejemploData, null, 2)}'`;

        return new Response(curlCommand, {
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    return NextResponse.json({
        message: 'API de testing de impresión',
        example: ejemploData,
        endpoints: {
            'POST /api/test-print':
                'Enviar datos para imprimir ticket de prueba',
            'GET /api/test-print?formato=curl':
                'Obtener comando curl de ejemplo',
        },
        testModes: {
            success: 'Impresión exitosa (default)',
            printer_error: 'Error de impresora',
            port_busy: 'Puerto ocupado',
        },
    });
}

// Función para generar contenido ESC/POS
function generarTicketESCPOS(datos) {
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
    ticket += datos.cliente + '\n';
    ticket += 'NIS: ' + datos.nis + '\n';
    ticket += '================================\n';

    // Información de la factura
    ticket += ESC + '!' + '\x08'; // Negrita
    ticket += 'FACTURA:\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += 'Numero: ' + datos.factura + '\n';
    ticket += 'Vencimiento: ' + datos.vencimiento + '\n';
    ticket += 'Fecha Vto: ' + datos.fecha + '\n';
    ticket += '================================\n';

    // Información del pago
    ticket += ESC + '!' + '\x08'; // Negrita
    ticket += 'PAGO:\n';
    ticket += ESC + '!' + '\x00'; // Texto normal
    ticket += 'Metodo: ' + datos.metodoPago + '\n';
    ticket += 'Fecha: ' + datos.fechaPago + '\n';
    ticket += 'ID Transaccion: ' + datos.transactionId + '\n';
    ticket += '================================\n';

    // Importe - destacado
    ticket += ESC + 'a' + '\x01'; // Centrar
    ticket += ESC + '!' + '\x38'; // Texto grande y negrita
    ticket += 'IMPORTE PAGADO\n';
    ticket += '$' + parseFloat(datos.importe).toLocaleString() + '\n';
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

// Función para generar vista previa en texto plano
function generarTicketTextoPlano(datos) {
    return `
================================
       COOPERATIVA POPULAR
      COMPROBANTE DE PAGO
================================

CLIENTE:
${datos.cliente}
NIS: ${datos.nis}
================================

FACTURA:
Numero: ${datos.factura}
Vencimiento: ${datos.vencimiento}
Fecha Vto: ${datos.fecha}
================================

PAGO:
Metodo: ${datos.metodoPago}
Fecha: ${datos.fechaPago}
ID Transaccion: ${datos.transactionId}
================================

      IMPORTE PAGADO
      $${parseFloat(datos.importe).toLocaleString()}
================================

   PAGO PROCESADO EXITOSAMENTE
       Gracias por su pago

      ${new Date().toLocaleString()}


`;
}
