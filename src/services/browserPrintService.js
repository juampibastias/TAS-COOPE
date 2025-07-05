// browserPrintService.js - SOLUCIÓN REAL PARA TAS

import Swal from 'sweetalert2';

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN REAL AUTOMÁTICA =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Iniciando impresión REAL automática...', datosTicket);

        // ✅ MÉTODO 1: API Backend para impresión directa
        const impresoExitoso = await enviarABackendParaImpresion(datosTicket);

        if (impresoExitoso) {
            mostrarNotificacionTAS(
                '✅ Comprobante impreso automáticamente',
                'success'
            );
            return true;
        } else {
            // ✅ MÉTODO 2: Fallback con instrucciones claras
            await mostrarSolucionTAS(datosTicket);
            return false;
        }
    } catch (error) {
        console.error('❌ Error en impresión:', error);
        await mostrarSolucionTAS(datosTicket);
        return false;
    }
}

// ===== ENVÍO A BACKEND PARA IMPRESIÓN DIRECTA =====
async function enviarABackendParaImpresion(datosTicket) {
    try {
        console.log('📡 Enviando a backend para impresión directa...');

        // Preparar datos para el backend
        const datosImpresion = {
            tipo: 'comprobante_pago',
            impresora: 'NPI Integration Driver',
            datos: datosTicket,
            formato: 'termico_80mm',
            timestamp: new Date().toISOString(),
        };

        // ✅ ENVÍO AL ENDPOINT DE IMPRESIÓN
        const response = await fetch('/api/imprimir-ticket', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(datosImpresion),
        });

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ Impresión exitosa desde backend:', resultado);
            return true;
        } else {
            console.log('❌ Backend no disponible, usando método alternativo');
            return false;
        }
    } catch (error) {
        console.log('❌ Error conectando con backend:', error.message);
        return false;
    }
}

// ===== MOSTRAR SOLUCIÓN DEFINITIVA PARA TAS =====
async function mostrarSolucionTAS(datosTicket) {
    return new Promise((resolve) => {
        // Crear modal personalizado sin SweetAlert
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #059669, #047857);
                color: white;
                padding: 40px;
                border-radius: 20px;
                max-width: 600px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h2 style="font-size: 32px; margin: 0 0 20px 0;">¡Pago Exitoso!</h2>
                <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.9;">
                    Tu pago de <strong>${parseFloat(
                        datosTicket.importe
                    ).toLocaleString(
                        'es-AR'
                    )}</strong> ha sido procesado correctamente
                </p>
                
                <div style="
                    background: rgba(255,255,255,0.1);
                    padding: 25px;
                    border-radius: 15px;
                    margin: 25px 0;
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">🖨️</div>
                    <h3 style="margin: 0 0 10px 0; color: #fef3c7; font-size: 20px;">Comprobante de pago</h3>
                    <p style="margin: 0; opacity: 0.8; font-size: 16px;">Factura N° ${
                        datosTicket.factura
                    }</p>
                </div>

                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <button id="imprimirAhora" style="
                        background: linear-gradient(135deg, #fbbf24, #f59e0b);
                        color: #000;
                        border: none;
                        padding: 18px 35px;
                        font-size: 20px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
                        min-width: 200px;
                    ">🖨️ IMPRIMIR</button>
                    
                    <button id="continuarSin" style="
                        background: rgba(255,255,255,0.15);
                        color: white;
                        border: 2px solid rgba(255,255,255,0.3);
                        padding: 18px 35px;
                        font-size: 20px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 200px;
                    ">CONTINUAR</button>
                </div>
                
                <p style="margin-top: 20px; font-size: 14px; opacity: 0.7;">
                    El comprobante se imprimirá automáticamente en tu impresora térmica
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        // Agregar eventos a los botones
        const btnImprimir = modal.querySelector('#imprimirAhora');
        const btnContinuar = modal.querySelector('#continuarSin');

        btnImprimir.addEventListener('click', async () => {
            try {
                // ✅ CAMBIAR TEXTO DEL BOTÓN MIENTRAS PROCESA
                btnImprimir.innerHTML = '🔄 IMPRIMIENDO...';
                btnImprimir.style.background = '#059669';
                btnImprimir.style.color = 'white';
                btnImprimir.disabled = true;

                // ✅ EJECUTAR IMPRESIÓN AUTOMÁTICA COMPLETA
                const exitoso = await ejecutarImpresionCompleta(datosTicket);

                if (exitoso) {
                    // ✅ ÉXITO - Cambiar botón y cerrar modal
                    btnImprimir.innerHTML = '✅ IMPRESO';
                    btnImprimir.style.background = '#10b981';

                    setTimeout(() => {
                        document.body.removeChild(modal);
                        resolve();
                    }, 1500);
                } else {
                    // ❌ ERROR - Restaurar botón
                    btnImprimir.innerHTML = '❌ ERROR - REINTENTAR';
                    btnImprimir.style.background = '#ef4444';
                    btnImprimir.disabled = false;
                }
            } catch (error) {
                console.error('Error en impresión:', error);
                btnImprimir.innerHTML = '❌ ERROR - REINTENTAR';
                btnImprimir.style.background = '#ef4444';
                btnImprimir.disabled = false;
            }
        });

        btnContinuar.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve();
        });

        // Hover effects
        btnImprimir.addEventListener('mouseenter', () => {
            if (!btnImprimir.disabled) {
                btnImprimir.style.transform = 'scale(1.05)';
                btnImprimir.style.boxShadow =
                    '0 6px 20px rgba(251, 191, 36, 0.6)';
            }
        });
        btnImprimir.addEventListener('mouseleave', () => {
            if (!btnImprimir.disabled) {
                btnImprimir.style.transform = 'scale(1)';
                btnImprimir.style.boxShadow =
                    '0 4px 15px rgba(251, 191, 36, 0.4)';
            }
        });

        btnContinuar.addEventListener('mouseenter', () => {
            btnContinuar.style.transform = 'scale(1.05)';
            btnContinuar.style.background = 'rgba(255,255,255,0.25)';
        });
        btnContinuar.addEventListener('mouseleave', () => {
            btnContinuar.style.transform = 'scale(1)';
            btnContinuar.style.background = 'rgba(255,255,255,0.15)';
        });
    });
}

// ===== EJECUTAR IMPRESIÓN COMPLETA AUTOMÁTICA =====
async function ejecutarImpresionCompleta(datosTicket) {
    try {
        console.log('🖨️ Ejecutando impresión completa automática...');

        // ✅ PASO 1: Preparar contenido optimizado
        crearPaginaImpresion(datosTicket);

        // ✅ PASO 2: Crear iframe temporal visible para impresión
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            width: 400px !important;
            height: 600px !important;
            transform: translate(-50%, -50%) !important;
            border: 3px solid #059669 !important;
            border-radius: 12px !important;
            z-index: 999998 !important;
            background: white !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3) !important;
        `;

        // ✅ PASO 3: Crear overlay de procesamiento
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0,0,0,0.8) !important;
            z-index: 999997 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: white !important;
            font-size: 18px !important;
            font-weight: bold !important;
            flex-direction: column !important;
        `;

        overlay.innerHTML = `
            <div style="
                position: absolute;
                top: 20%;
                text-align: center;
                background: #059669;
                padding: 25px 40px;
                border-radius: 15px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 48px; margin-bottom: 15px; animation: pulse 1.5s infinite;">🖨️</div>
                <div style="font-size: 20px; margin-bottom: 10px;">Preparando impresión...</div>
                <div style="font-size: 14px; opacity: 0.8;">Se abrirá el diálogo automáticamente</div>
            </div>
        `;

        // ✅ PASO 4: Agregar elementos al DOM
        document.body.appendChild(overlay);
        document.body.appendChild(iframe);

        // ✅ PASO 5: Preparar contenido en iframe
        const contenidoImpresion = generarHTMLImpresion(datosTicket);
        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(contenidoImpresion);
        iframeDoc.close();

        // ✅ PASO 6: Ejecutar impresión automática después de breve pausa
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    // Foco en iframe y ejecutar print
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    console.log(
                        '✅ window.print() ejecutado automáticamente desde iframe'
                    );

                    // ✅ PASO 7: Limpiar después de 4 segundos
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                            document.body.removeChild(overlay);
                        } catch (e) {
                            console.log('ℹ️ Elementos ya removidos');
                        }
                        resolve(true);
                    }, 4000);
                } catch (error) {
                    console.error(
                        '❌ Error ejecutando print automático:',
                        error
                    );
                    try {
                        document.body.removeChild(iframe);
                        document.body.removeChild(overlay);
                    } catch (e) {}
                    resolve(false);
                }
            }, 1500); // Pausa de 1.5 segundos para que se vea el overlay
        });
    } catch (error) {
        console.error('❌ Error en impresión completa:', error);
        return false;
    }
}



// ===== GENERAR HTML OPTIMIZADO PARA IMPRESIÓN =====
function generarHTMLImpresion(datosTicket) {
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

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Comprobante de Pago - ${factura}</title>
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
                        background: white;
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
                    body {
                        width: 350px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        margin: 20px;
                        padding: 15px;
                        border: 1px solid #ccc;
                        background: white;
                        border-radius: 8px;
                    }
                    
                    .preview-note {
                        background: #059669;
                        color: white;
                        padding: 10px;
                        text-align: center;
                        border-radius: 5px;
                        margin-bottom: 15px;
                        font-weight: bold;
                    }
                }
            </style>
        </head>
        <body>
            <div class="preview-note">
                📄 Vista previa del comprobante - Se imprimirá automáticamente
            </div>
            
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
            <div>Número: ${factura}</div>
            <div>Vencimiento: ${vencimiento}</div>
            <div>Fecha Vto: ${fecha}</div>
            
            <div class="separator"></div>
            
            <div class="section-title">PAGO:</div>
            <div>Método: ${metodoPago}</div>
            <div>Fecha: ${fechaPago}</div>
            <div>ID: ${transactionId}</div>
            
            <div class="separator"></div>
            
            <div class="amount">
                IMPORTE PAGADO<br>
                ${parseFloat(importe).toLocaleString('es-AR')}
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
}

// ===== CREAR PÁGINA OPTIMIZADA PARA IMPRESIÓN =====
function crearPaginaImpresion(datosTicket) {
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

    // Limpiar cualquier contenido de impresión anterior
    const existingPrintContent = document.querySelector('.tas-print-content');
    if (existingPrintContent) {
        existingPrintContent.remove();
    }

    // Crear contenido optimizado para NPI Integration Driver
    const printDiv = document.createElement('div');
    printDiv.className = 'tas-print-content';
    printDiv.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';

    printDiv.innerHTML = `
        <div style="
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 0;
        ">
            <div style="text-align: center; font-weight: bold; margin-bottom: 5mm;">
                COOPERATIVA POPULAR<br>
                COMPROBANTE DE PAGO
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
            
            <div style="font-weight: bold;">CLIENTE:</div>
            <div>${cliente}</div>
            <div>NIS: ${nis}</div>
            
            <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
            
            <div style="font-weight: bold;">FACTURA:</div>
            <div>Número: ${factura}</div>
            <div>Vencimiento: ${vencimiento}</div>
            <div>Fecha Vto: ${fecha}</div>
            
            <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
            
            <div style="font-weight: bold;">PAGO:</div>
            <div>Método: ${metodoPago}</div>
            <div>Fecha: ${fechaPago}</div>
            <div>ID: ${transactionId}</div>
            
            <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
            
            <div style="
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin: 5mm 0;
                border: 2px solid #000;
                padding: 3mm;
            ">
                IMPORTE PAGADO<br>
                $${parseFloat(importe).toLocaleString('es-AR')}
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 3mm 0;"></div>
            
            <div style="text-align: center; margin-top: 5mm;">
                ✅ PAGO PROCESADO EXITOSAMENTE<br>
                Gracias por su pago<br><br>
                ${new Date().toLocaleString('es-AR')}
            </div>
        </div>
    `;

    document.body.appendChild(printDiv);

    // Agregar estilos específicos para impresión
    const existingStyle = document.querySelector('#tas-print-styles');
    if (existingStyle) {
        existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'tas-print-styles';
    style.textContent = `
        @media print {
            body * {
                visibility: hidden;
            }
            .tas-print-content,
            .tas-print-content * {
                visibility: visible;
            }
            .tas-print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            @page {
                size: 80mm auto;
                margin: 0;
            }
        }
    `;
    document.head.appendChild(style);

    console.log('✅ Página de impresión preparada para NPI Integration Driver');
}

// ===== NOTIFICACIÓN DISCRETA =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#059669' : '#dc2626'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 999999;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
    `;
    toast.textContent = mensaje;

    // Agregar animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    setTimeout(() => {
        try {
            document.body.removeChild(toast);
            document.head.removeChild(style);
        } catch (e) {}
    }, 3000);
}

// ===== FUNCIÓN PARA PREPARAR DATOS DEL TICKET =====
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

// ===== FUNCIÓN PARA TICKETS DE ERROR =====
export async function imprimirTicketError(datosTicketError) {
    console.log('🖨️ Ticket de error - usando mismo sistema que éxito');
    return await imprimirTicketDesdeNavegador(datosTicketError);
}

// ===== FUNCIÓN PARA PREPARAR DATOS DE ERROR =====
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

// ===== TESTING =====
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
