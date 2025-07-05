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
                <p style="font-size: 18px; margin-bottom: 30px;">Tu pago ha sido procesado correctamente</p>
                
                <div style="
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                ">
                    <h3 style="margin: 0 0 15px 0; color: #fef3c7;">🖨️ Para imprimir el comprobante:</h3>
                    <div style="text-align: left; margin: 15px 0;">
                        <p style="margin: 5px 0;">1. Presiona <strong>Ctrl + P</strong></p>
                        <p style="margin: 5px 0;">2. Selecciona <strong>"NPI Integration Driver"</strong></p>
                        <p style="margin: 5px 0;">3. Haz clic en <strong>"Imprimir"</strong></p>
                    </div>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                    <button id="imprimirAhora" style="
                        background: #fbbf24;
                        color: #000;
                        border: none;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">🖨️ IMPRIMIR AHORA</button>
                    
                    <button id="continuarSin" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 2px solid rgba(255,255,255,0.3);
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                    ">CONTINUAR SIN IMPRIMIR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Agregar eventos a los botones
        const btnImprimir = modal.querySelector('#imprimirAhora');
        const btnContinuar = modal.querySelector('#continuarSin');

        btnImprimir.addEventListener('click', () => {
            // Crear contenido para impresión
            crearPaginaImpresion(datosTicket);
            // Ejecutar Ctrl+P automáticamente
            setTimeout(() => {
                if (navigator.platform.includes('Win')) {
                    // Simular Ctrl+P en Windows
                    document.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            key: 'p',
                            ctrlKey: true,
                            bubbles: true,
                        })
                    );
                } else {
                    // Ejecutar print() como fallback
                    window.print();
                }
            }, 500);
        });

        btnContinuar.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve();
        });

        // Hover effects
        btnImprimir.addEventListener('mouseenter', () => {
            btnImprimir.style.transform = 'scale(1.05)';
            btnImprimir.style.background = '#f59e0b';
        });
        btnImprimir.addEventListener('mouseleave', () => {
            btnImprimir.style.transform = 'scale(1)';
            btnImprimir.style.background = '#fbbf24';
        });

        btnContinuar.addEventListener('mouseenter', () => {
            btnContinuar.style.transform = 'scale(1.05)';
            btnContinuar.style.background = 'rgba(255,255,255,0.3)';
        });
        btnContinuar.addEventListener('mouseleave', () => {
            btnContinuar.style.transform = 'scale(1)';
            btnContinuar.style.background = 'rgba(255,255,255,0.2)';
        });
    });
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
