// browserPrintService.js - SOLUCIÓN DEFINITIVA TAS CON CONFIGURACIÓN CHROME

import Swal from 'sweetalert2';

// ===== VERIFICAR CONFIGURACIÓN DE CHROME PARA TAS =====
function verificarConfiguracionTAS() {
    const configuracion = {
        modoKiosk:
            window.location.search.includes('kiosk') ||
            localStorage.getItem('tas-modo-kiosk') === 'true',
        impresoraConfigurada:
            localStorage.getItem('tas-impresora-configurada') === 'true',
        impresoraPredeterminada:
            localStorage.getItem('tas-impresora-nombre') ||
            'NPI Integration Driver',
    };

    console.log('🔍 Configuración TAS:', configuracion);
    return configuracion;
}

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN TAS OPTIMIZADA =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Iniciando impresión TAS optimizada...', datosTicket);

        const config = verificarConfiguracionTAS();

        if (config.impresoraConfigurada) {
            // ✅ MODO PRODUCCIÓN: Impresión rápida
            return await imprimirModoProduccionTAS(
                datosTicket,
                config.impresoraPredeterminada
            );
        } else {
            // ⚙️ MODO CONFIGURACIÓN: Primera vez
            return await imprimirModoConfiguracionTAS(datosTicket);
        }
    } catch (error) {
        console.error('❌ Error en impresión TAS:', error);
        mostrarNotificacionTAS('❌ Error en impresión', 'error');
        return false;
    }
}

// ===== MODO PRODUCCIÓN: IMPRESIÓN RÁPIDA SIN CONFIGURACIÓN =====
async function imprimirModoProduccionTAS(datosTicket, impresoraNombre) {
    try {
        console.log('🚀 Modo producción - Impresión rápida automática');

        // ✅ NOTIFICACIÓN MÍNIMA: Solo feedback visual discreto
        mostrarNotificacionImprimiendo();

        // ✅ MÉTODO 1: Window.print() optimizado con configuración guardada
        const exitoso = await ejecutarImpresionRapida(
            datosTicket,
            impresoraNombre
        );

        if (exitoso) {
            mostrarNotificacionTAS('✅ Comprobante impreso', 'success');
            return true;
        } else {
            // Fallback: Mostrar modal rápido
            return await mostrarModalImpresionRapida(datosTicket);
        }
    } catch (error) {
        console.error('❌ Error en modo producción:', error);
        return await mostrarModalImpresionRapida(datosTicket);
    }
}

// ===== MODO CONFIGURACIÓN: PRIMERA VEZ =====
async function imprimirModoConfiguracionTAS(datosTicket) {
    try {
        console.log('⚙️ Modo configuración - Primera configuración');

        // Modal de configuración elegante
        const configurado = await mostrarModalConfiguracionInicial(datosTicket);

        if (configurado) {
            // Guardar configuración permanentemente
            localStorage.setItem('tas-impresora-configurada', 'true');
            localStorage.setItem(
                'tas-impresora-nombre',
                'NPI Integration Driver'
            );
            localStorage.setItem(
                'tas-configuracion-fecha',
                new Date().toISOString()
            );

            mostrarNotificacionTAS(
                '✅ Impresora configurada correctamente',
                'success'
            );
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Error en configuración:', error);
        return false;
    }
}

// ===== EJECUTAR IMPRESIÓN RÁPIDA (MODO PRODUCCIÓN) =====
async function ejecutarImpresionRapida(datosTicket, impresoraNombre) {
    try {
        console.log('⚡ Ejecutando impresión rápida para:', impresoraNombre);

        // ✅ CREAR CONTENIDO DE IMPRESIÓN OPTIMIZADO
        const contenidoHTML = generarHTMLImpresionOptimizado(datosTicket);

        // ✅ IFRAME INVISIBLE RÁPIDO
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: absolute !important;
            left: -9999px !important;
            top: -9999px !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0 !important;
            visibility: hidden !important;
        `;

        document.body.appendChild(iframe);

        // ✅ ESCRIBIR CONTENIDO Y EJECUTAR PRINT INMEDIATAMENTE
        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(contenidoHTML);
        iframeDoc.close();

        // ✅ IMPRESIÓN AUTOMÁTICA INMEDIATA
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    console.log('✅ Print ejecutado automáticamente');

                    // Limpiar después de 2 segundos
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {}
                        resolve(true);
                    }, 2000);
                } catch (error) {
                    console.error('❌ Error en print rápido:', error);
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) {}
                    resolve(false);
                }
            }, 100); // Mínima demora para que cargue
        });
    } catch (error) {
        console.error('❌ Error en impresión rápida:', error);
        return false;
    }
}

// ===== MODAL DE CONFIGURACIÓN INICIAL =====
async function mostrarModalConfiguracionInicial(datosTicket) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.95);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1f2937, #374151);
                color: white;
                padding: 50px;
                border-radius: 20px;
                max-width: 700px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                border: 2px solid #059669;
            ">
                <div style="font-size: 72px; margin-bottom: 25px;">⚙️</div>
                <h2 style="font-size: 36px; margin: 0 0 25px 0; color: #059669;">Configuración de Impresora</h2>
                <p style="font-size: 20px; margin-bottom: 35px; opacity: 0.9; line-height: 1.5;">
                    Este es un proceso <strong>único</strong>. Después de configurar, 
                    todos los pagos imprimirán automáticamente.
                </p>
                
                <div style="
                    background: rgba(5, 150, 105, 0.1);
                    padding: 30px;
                    border-radius: 15px;
                    margin: 30px 0;
                    border: 1px solid rgba(5, 150, 105, 0.3);
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">🖨️</div>
                    <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 24px;">Primer Comprobante</h3>
                    <p style="margin: 0; opacity: 0.8; font-size: 16px;">
                        Factura N° ${datosTicket.factura} - ${parseFloat(
            datosTicket.importe
        ).toLocaleString('es-AR')}
                    </p>
                </div>

                <div style="
                    background: rgba(59, 130, 246, 0.1);
                    padding: 25px;
                    border-radius: 12px;
                    margin: 25px 0;
                    text-align: left;
                ">
                    <h4 style="margin: 0 0 15px 0; color: #3b82f6; font-size: 18px;">📋 Instrucciones:</h4>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Haz clic en <strong>"⚙️ CONFIGURAR AHORA"</strong></li>
                        <li>Se abrirá el diálogo de impresión</li>
                        <li>Selecciona <strong>"NPI Integration Driver"</strong></li>
                        <li>Haz clic en <strong>"Imprimir"</strong></li>
                        <li>Confirma que imprimió correctamente</li>
                    </ol>
                </div>

                <div style="display: flex; gap: 25px; justify-content: center; margin-top: 40px;">
                    <button id="configurarAhora" style="
                        background: linear-gradient(135deg, #059669, #047857);
                        color: white;
                        border: none;
                        padding: 20px 40px;
                        font-size: 22px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 20px rgba(5, 150, 105, 0.4);
                        min-width: 250px;
                    ">⚙️ CONFIGURAR AHORA</button>
                    
                    <button id="saltarConfiguracion" style="
                        background: rgba(255,255,255,0.1);
                        color: #94a3b8;
                        border: 2px solid rgba(255,255,255,0.2);
                        padding: 20px 40px;
                        font-size: 22px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 250px;
                    ">SALTAR</button>
                </div>
                
                <p style="margin-top: 25px; font-size: 14px; opacity: 0.6;">
                    💡 Después de esta configuración, todos los pagos imprimirán sin diálogos
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        const btnConfigurar = modal.querySelector('#configurarAhora');
        const btnSaltar = modal.querySelector('#saltarConfiguracion');

        btnConfigurar.addEventListener('click', async () => {
            try {
                // Cambiar botón mientras procesa
                btnConfigurar.innerHTML = '🔄 CONFIGURANDO...';
                btnConfigurar.style.background = '#374151';
                btnConfigurar.disabled = true;

                // Ejecutar configuración
                const exitoso = await ejecutarConfiguracionImpresora(
                    datosTicket
                );

                if (exitoso) {
                    btnConfigurar.innerHTML = '✅ CONFIGURADO';
                    btnConfigurar.style.background = '#059669';

                    setTimeout(() => {
                        document.body.removeChild(modal);
                        resolve(true);
                    }, 1500);
                } else {
                    btnConfigurar.innerHTML = '❌ ERROR - REINTENTAR';
                    btnConfigurar.style.background = '#ef4444';
                    btnConfigurar.disabled = false;
                }
            } catch (error) {
                console.error('Error en configuración:', error);
                btnConfigurar.innerHTML = '❌ ERROR - REINTENTAR';
                btnConfigurar.style.background = '#ef4444';
                btnConfigurar.disabled = false;
            }
        });

        btnSaltar.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });

        // Hover effects
        btnConfigurar.addEventListener('mouseenter', () => {
            if (!btnConfigurar.disabled) {
                btnConfigurar.style.transform = 'scale(1.05)';
                btnConfigurar.style.boxShadow =
                    '0 6px 25px rgba(5, 150, 105, 0.6)';
            }
        });
        btnConfigurar.addEventListener('mouseleave', () => {
            if (!btnConfigurar.disabled) {
                btnConfigurar.style.transform = 'scale(1)';
                btnConfigurar.style.boxShadow =
                    '0 4px 20px rgba(5, 150, 105, 0.4)';
            }
        });
    });
}

// ===== EJECUTAR CONFIGURACIÓN DE IMPRESORA =====
async function ejecutarConfiguracionImpresora(datosTicket) {
    try {
        console.log('⚙️ Ejecutando configuración de impresora...');

        // Crear contenido para configuración
        const contenidoHTML = generarHTMLConfiguracion(datosTicket);

        // Crear iframe visible para configuración
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            width: 450px !important;
            height: 650px !important;
            transform: translate(-50%, -50%) !important;
            border: 3px solid #059669 !important;
            border-radius: 15px !important;
            z-index: 999998 !important;
            background: white !important;
            box-shadow: 0 15px 50px rgba(0,0,0,0.4) !important;
        `;

        document.body.appendChild(iframe);

        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(contenidoHTML);
        iframeDoc.close();

        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();

                    console.log('✅ Configuración ejecutada - print() llamado');

                    // Preguntar si funcionó después de 5 segundos
                    setTimeout(async () => {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {}

                        const funcionó = await preguntarSiFuncionó();
                        resolve(funcionó);
                    }, 5000);
                } catch (error) {
                    console.error('❌ Error en configuración:', error);
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) {}
                    resolve(false);
                }
            }, 1000);
        });
    } catch (error) {
        console.error('❌ Error ejecutando configuración:', error);
        return false;
    }
}

// ===== PREGUNTAR SI LA CONFIGURACIÓN FUNCIONÓ =====
async function preguntarSiFuncionó() {
    return new Promise((resolve) => {
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
                background: white;
                color: #1f2937;
                padding: 40px;
                border-radius: 20px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">❓</div>
                <h2 style="font-size: 28px; margin: 0 0 20px 0; color: #1f2937;">¿Se imprimió correctamente?</h2>
                <p style="font-size: 16px; margin-bottom: 30px; color: #6b7280; line-height: 1.6;">
                    ¿Tu impresora <strong>NPI Integration Driver</strong> imprimió el comprobante de prueba?
                </p>

                <div style="display: flex; gap: 20px; justify-content: center;">
                    <button id="siImprimio" style="
                        background: linear-gradient(135deg, #059669, #047857);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 150px;
                    ">✅ SÍ IMPRIMIÓ</button>
                    
                    <button id="noImprimio" style="
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 150px;
                    ">❌ NO IMPRIMIÓ</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#siImprimio').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(true);
        });

        modal.querySelector('#noImprimio').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// ===== MODAL DE IMPRESIÓN RÁPIDA (FALLBACK) =====
async function mostrarModalImpresionRapida(datosTicket) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.85);
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
                padding: 35px;
                border-radius: 15px;
                max-width: 500px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🖨️</div>
                <h2 style="font-size: 24px; margin: 0 0 15px 0;">Imprimir Comprobante</h2>
                <p style="font-size: 16px; margin-bottom: 25px; opacity: 0.9;">
                    Factura N° ${datosTicket.factura} - ${parseFloat(
            datosTicket.importe
        ).toLocaleString('es-AR')}
                </p>

                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="imprimirRapido" style="
                        background: #fbbf24;
                        color: #000;
                        border: none;
                        padding: 15px 25px;
                        font-size: 16px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 150px;
                    ">🖨️ IMPRIMIR</button>
                    
                    <button id="cerrarModal" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 15px 25px;
                        font-size: 16px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 150px;
                    ">CERRAR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal
            .querySelector('#imprimirRapido')
            .addEventListener('click', async () => {
                const exitoso = await ejecutarImpresionRapida(
                    datosTicket,
                    'NPI Integration Driver'
                );
                document.body.removeChild(modal);
                resolve(exitoso);
            });

        modal.querySelector('#cerrarModal').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// ===== NOTIFICACIÓN DE IMPRIMIENDO =====
function mostrarNotificacionImprimiendo() {
    const toast = document.createElement('div');
    toast.id = 'toast-imprimiendo';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 999999;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    toast.innerHTML = `
        <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #fbbf24;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
        🖨️ Imprimiendo...
    `;

    // Agregar animación de giro
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Remover después de 3 segundos
    setTimeout(() => {
        try {
            const elemento = document.getElementById('toast-imprimiendo');
            if (elemento) {
                document.body.removeChild(elemento);
            }
            document.head.removeChild(style);
        } catch (e) {}
    }, 3000);
}

// ===== NOTIFICACIÓN DISCRETA =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    // Remover notificación anterior
    const anterior = document.getElementById('toast-tas');
    if (anterior) {
        try {
            document.body.removeChild(anterior);
        } catch (e) {}
    }

    const toast = document.createElement('div');
    toast.id = 'toast-tas';
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

    document.body.appendChild(toast);

    setTimeout(() => {
        try {
            const elemento = document.getElementById('toast-tas');
            if (elemento) {
                document.body.removeChild(elemento);
            }
        } catch (e) {}
    }, 3000);
}

// ===== GENERAR HTML OPTIMIZADO PARA IMPRESIÓN =====
function generarHTMLImpresionOptimizado(datosTicket) {
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
            <title>Comprobante ${factura}</title>
            <style>
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                
                body {
                    width: 80mm;
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    line-height: 1.3;
                    margin: 0;
                    padding: 2mm;
                    color: #000;
                    background: white;
                }
                
                .header {
                    text-align: center;
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 3mm;
                }
                
                .separator {
                    border-top: 1px dashed #000;
                    margin: 2mm 0;
                }
                
                .section-title {
                    font-weight: bold;
                    margin: 1mm 0;
                }
                
                .amount {
                    text-align: center;
                    font-size: 14px;
                    font-weight: bold;
                    margin: 3mm 0;
                    border: 1px solid #000;
                    padding: 2mm;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 3mm;
                    font-weight: bold;
                    font-size: 10px;
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
                $${parseFloat(importe).toLocaleString('es-AR')}
            </div>
            
            <div class="separator"></div>
            
            <div class="footer">
                ✅ PAGO PROCESADO EXITOSAMENTE<br>
                Gracias por su pago<br>
                ${new Date().toLocaleString('es-AR')}
            </div>
        </body>
        </html>
    `;
}

// ===== GENERAR HTML PARA CONFIGURACIÓN =====
function generarHTMLConfiguracion(datosTicket) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Configuración Impresora TAS</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    text-align: center;
                    background: linear-gradient(135deg, #059669, #047857);
                    color: white;
                    margin: 0;
                }
                
                .config-header {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                
                .instructions {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: left;
                }
                
                .test-ticket {
                    background: white;
                    color: #000;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    text-align: left;
                }
                
                @media print {
                    body {
                        background: white !important;
                        color: #000 !important;
                        font-size: 11px;
                    }
                    .config-header, .instructions {
                        display: none !important;
                    }
                    .test-ticket {
                        background: white !important;
                        border: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        font-size: 11px !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="config-header">
                ⚙️ CONFIGURACIÓN DE IMPRESORA TAS
            </div>
            
            <div class="instructions">
                <h3 style="margin-top: 0; color: #fbbf24;">📋 Instrucciones:</h3>
                <ol>
                    <li>Se abrirá automáticamente el diálogo de impresión</li>
                    <li>Selecciona <strong>"NPI Integration Driver"</strong></li>
                    <li>Haz clic en <strong>"Imprimir"</strong> o <strong>"Print"</strong></li>
                    <li>Verifica que imprima el comprobante de prueba</li>
                </ol>
                <p style="color: #fbbf24; font-weight: bold;">
                    💡 Después de esta configuración, todos los pagos imprimirán automáticamente
                </p>
            </div>

            <div class="test-ticket">
                <div style="text-align: center; font-weight: bold; margin-bottom: 10px;">
                    COOPERATIVA POPULAR<br>
                    COMPROBANTE DE PRUEBA
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div><strong>CLIENTE:</strong></div>
                <div>${datosTicket.cliente}</div>
                <div>NIS: ${datosTicket.nis}</div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div><strong>FACTURA:</strong></div>
                <div>Número: ${datosTicket.factura}</div>
                <div>Importe: ${parseFloat(datosTicket.importe).toLocaleString(
                    'es-AR'
                )}</div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div style="text-align: center; font-weight: bold; margin: 10px 0;">
                    ✅ CONFIGURACIÓN DE PRUEBA
                </div>
                
                <div style="text-align: center; font-size: 10px;">
                    ${new Date().toLocaleString('es-AR')}<br>
                    Si ves este texto, la impresora funciona correctamente
                </div>
            </div>
        </body>
        </html>
    `;
}

// ===== FUNCIONES AUXILIARES PARA EXPORTAR =====

// Preparar datos del ticket
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

// Ticket de error usando el mismo sistema
export async function imprimirTicketError(datosTicketError) {
    console.log('🖨️ Ticket de error - usando mismo sistema optimizado');
    return await imprimirTicketDesdeNavegador(datosTicketError);
}

// Preparar datos de error
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

// Función para resetear configuración (para testing)
export function resetearConfiguracionTAS() {
    localStorage.removeItem('tas-impresora-configurada');
    localStorage.removeItem('tas-impresora-nombre');
    localStorage.removeItem('tas-configuracion-fecha');
    console.log('🔄 Configuración TAS reseteada');
}

// Función para verificar estado de configuración
export function verificarEstadoConfiguracion() {
    const config = verificarConfiguracionTAS();
    console.log('📊 Estado actual de configuración TAS:', config);
    return config;
}

// Testing
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
