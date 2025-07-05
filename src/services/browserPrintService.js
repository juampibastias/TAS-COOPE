// browserPrintService.js - SOLUCIÓN REAL PARA TAS CON IMPRESORAS LOCALES

import Swal from 'sweetalert2';

// ===== VERIFICAR ENTORNO CLIENTE =====
const isClient = typeof window !== 'undefined';

// ===== CONFIGURACIÓN GLOBAL TAS =====
const TAS_CONFIG = {
    // Flag para indicar que es un entorno TAS
    esTAS:
        isClient &&
        (localStorage.getItem('TAS_MODE') === 'true' ||
            window.location.search.includes('tas=true')),

    // Configuración de impresora guardada
    impresoraConfigurada:
        isClient && localStorage.getItem('tas-impresora-ok') === 'true',

    // Modo de impresión (auto, manual, deshabilitado)
    modoImpresion: isClient
        ? localStorage.getItem('tas-modo-impresion') || 'auto'
        : 'auto',
};

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN TAS REAL =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log(
            '🖨️ Iniciando impresión TAS (cliente con impresora local)...',
            datosTicket
        );

        // ✅ VERIFICAR SI ESTAMOS EN EL CLIENTE
        if (!isClient) {
            console.log('⚠️ Función llamada en el servidor - ignorando');
            return false;
        }

        // ✅ VERIFICAR SI ES ENTORNO TAS
        if (!TAS_CONFIG.esTAS) {
            console.log('ℹ️ No es entorno TAS - usando impresión estándar');
            return await impresionEstandarNavegador(datosTicket);
        }

        // ✅ VERIFICAR CONFIGURACIÓN DE IMPRESORA TAS
        if (!TAS_CONFIG.impresoraConfigurada) {
            console.log('⚙️ Primera configuración TAS requerida');
            return await configurarImpresoraTASPrimeraVez(datosTicket);
        }

        // ✅ VERIFICAR MODO DE IMPRESIÓN
        if (TAS_CONFIG.modoImpresion === 'deshabilitado') {
            console.log('🚫 Impresión TAS deshabilitada');
            mostrarNotificacionTAS(
                'ℹ️ Impresión deshabilitada en configuración TAS',
                'info'
            );
            return false;
        }

        // ✅ IMPRESIÓN AUTOMÁTICA TAS (sin diálogos visibles)
        return await ejecutarImpresionTASAutomatica(datosTicket);
    } catch (error) {
        console.error('❌ Error en impresión TAS:', error);
        mostrarNotificacionTAS('❌ Error en impresión TAS', 'error');
        return false;
    }
}

// ===== CONFIGURACIÓN PRIMERA VEZ TAS =====
async function configurarImpresoraTASPrimeraVez(datosTicket) {
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
                padding: 40px;
                border-radius: 20px;
                max-width: 700px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                border: 2px solid #f59e0b;
            ">
                <div style="font-size: 72px; margin-bottom: 25px;">🏪</div>
                <h2 style="font-size: 32px; margin: 0 0 25px 0; color: #f59e0b;">CONFIGURACIÓN TAS</h2>
                <p style="font-size: 18px; margin-bottom: 30px; opacity: 0.9; line-height: 1.5;">
                    <strong>Terminal de Autoservicio</strong><br>
                    Configuración única para impresora local
                </p>
                
                <div style="
                    background: rgba(245, 158, 11, 0.1);
                    padding: 25px;
                    border-radius: 15px;
                    margin: 25px 0;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    text-align: left;
                ">
                    <h3 style="margin: 0 0 15px 0; color: #fbbf24; font-size: 18px;">🔧 Configuración requerida:</h3>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <p style="margin: 8px 0;"><strong>1.</strong> Conectar impresora térmica por USB</p>
                        <p style="margin: 8px 0;"><strong>2.</strong> Instalar driver "NPI Integration Driver"</p>
                        <p style="margin: 8px 0;"><strong>3.</strong> Configurar como impresora predeterminada</p>
                        <p style="margin: 8px 0;"><strong>4.</strong> Habilitar impresión automática en Chrome</p>
                    </div>
                </div>

                <div style="
                    background: rgba(239, 68, 68, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                ">
                    <h4 style="margin: 0 0 10px 0; color: #f87171; font-size: 16px;">⚠️ IMPORTANTE:</h4>
                    <p style="margin: 0; font-size: 14px;">
                        Chrome SIEMPRE mostrará diálogos de impresión por seguridad.<br>
                        Esta configuración minimiza las interrupciones pero no las elimina completamente.
                    </p>
                </div>

                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <button id="configurarTAS" style="
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        border: none;
                        padding: 18px 35px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
                        min-width: 200px;
                    ">🔧 CONFIGURAR TAS</button>
                    
                    <button id="usarModoManual" style="
                        background: rgba(255,255,255,0.15);
                        color: #94a3b8;
                        border: 2px solid rgba(255,255,255,0.2);
                        padding: 18px 35px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 12px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 200px;
                    ">📱 MODO MANUAL</button>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; opacity: 0.6;">
                    💡 Configuración una sola vez por terminal
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        const btnConfigurar = modal.querySelector('#configurarTAS');
        const btnManual = modal.querySelector('#usarModoManual');

        btnConfigurar.addEventListener('click', async () => {
            try {
                btnConfigurar.innerHTML = '🔄 CONFIGURANDO...';
                btnConfigurar.disabled = true;

                const exitoso = await ejecutarConfiguracionTAS(datosTicket);

                if (exitoso) {
                    // Guardar configuración TAS
                    if (isClient) {
                        localStorage.setItem('TAS_MODE', 'true');
                        localStorage.setItem('tas-impresora-ok', 'true');
                        localStorage.setItem('tas-modo-impresion', 'auto');
                        localStorage.setItem(
                            'tas-config-fecha',
                            new Date().toISOString()
                        );
                    }

                    TAS_CONFIG.esTAS = true;
                    TAS_CONFIG.impresoraConfigurada = true;
                    TAS_CONFIG.modoImpresion = 'auto';

                    btnConfigurar.innerHTML = '✅ CONFIGURADO';
                    btnConfigurar.style.background = '#059669';

                    setTimeout(() => {
                        document.body.removeChild(modal);
                        mostrarNotificacionTAS(
                            '✅ TAS configurado correctamente',
                            'success'
                        );
                        resolve(true);
                    }, 2000);
                } else {
                    btnConfigurar.innerHTML = '❌ ERROR - REINTENTAR';
                    btnConfigurar.style.background = '#ef4444';
                    btnConfigurar.disabled = false;
                }
            } catch (error) {
                console.error('Error en configuración TAS:', error);
                btnConfigurar.innerHTML = '❌ ERROR - REINTENTAR';
                btnConfigurar.style.background = '#ef4444';
                btnConfigurar.disabled = false;
            }
        });

        btnManual.addEventListener('click', () => {
            // Configurar modo manual
            if (isClient) {
                localStorage.setItem('TAS_MODE', 'true');
                localStorage.setItem('tas-impresora-ok', 'true');
                localStorage.setItem('tas-modo-impresion', 'manual');
            }

            TAS_CONFIG.esTAS = true;
            TAS_CONFIG.impresoraConfigurada = true;
            TAS_CONFIG.modoImpresion = 'manual';

            document.body.removeChild(modal);
            mostrarNotificacionTAS('📱 Modo manual configurado', 'info');
            resolve(true);
        });
    });
}

// ===== EJECUTAR CONFIGURACIÓN TAS =====
async function ejecutarConfiguracionTAS(datosTicket) {
    try {
        console.log('🔧 Ejecutando configuración TAS...');

        // Crear contenido de prueba
        const contenidoHTML = generarHTMLPruebaTAS(datosTicket);

        // Mostrar instrucciones en overlay
        const overlay = crearOverlayInstrucciones();
        document.body.appendChild(overlay);

        // Crear iframe para prueba de impresión
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            width: 400px !important;
            height: 500px !important;
            transform: translate(-50%, -50%) !important;
            border: 3px solid #f59e0b !important;
            border-radius: 12px !important;
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

                    console.log('✅ Configuración TAS ejecutada');

                    // Preguntar resultado después de 6 segundos
                    setTimeout(async () => {
                        try {
                            document.body.removeChild(iframe);
                            document.body.removeChild(overlay);
                        } catch (e) {}

                        const exitoso = await preguntarResultadoConfiguracion();
                        resolve(exitoso);
                    }, 6000);
                } catch (error) {
                    console.error('❌ Error en configuración TAS:', error);
                    try {
                        document.body.removeChild(iframe);
                        document.body.removeChild(overlay);
                    } catch (e) {}
                    resolve(false);
                }
            }, 1500);
        });
    } catch (error) {
        console.error('❌ Error ejecutando configuración TAS:', error);
        return false;
    }
}

// ===== CREAR OVERLAY DE INSTRUCCIONES =====
function crearOverlayInstrucciones() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0,0,0,0.85) !important;
        z-index: 999997 !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        padding-top: 50px !important;
        color: white !important;
        font-family: Arial, sans-serif !important;
    `;

    overlay.innerHTML = `
        <div style="
            background: #f59e0b;
            color: #000;
            padding: 25px 35px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 500px;
            margin: 0 20px;
        ">
            <div style="font-size: 40px; margin-bottom: 15px;">🖨️</div>
            <h3 style="margin: 0 0 15px 0; font-size: 20px;">CONFIGURANDO IMPRESORA TAS</h3>
            <div style="font-size: 14px; line-height: 1.6; text-align: left;">
                <p style="margin: 8px 0;"><strong>1.</strong> Se abrirá el diálogo de impresión</p>
                <p style="margin: 8px 0;"><strong>2.</strong> Selecciona "NPI Integration Driver"</p>
                <p style="margin: 8px 0;"><strong>3.</strong> Haz clic en "Imprimir"</p>
                <p style="margin: 8px 0;"><strong>4.</strong> Confirma que se imprimió</p>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 8px;">
                <small><strong>💡 Tip:</strong> Después de esta configuración, los diálogos serán más rápidos</small>
            </div>
        </div>
    `;

    return overlay;
}

// ===== PREGUNTAR RESULTADO DE CONFIGURACIÓN =====
async function preguntarResultadoConfiguracion() {
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
                <h2 style="font-size: 26px; margin: 0 0 20px 0; color: #1f2937;">¿Se configuró correctamente?</h2>
                <p style="font-size: 16px; margin-bottom: 30px; color: #6b7280; line-height: 1.6;">
                    ¿Tu impresora <strong>NPI Integration Driver</strong> imprimió la página de prueba?
                </p>

                <div style="display: flex; gap: 20px; justify-content: center;">
                    <button id="configExitosa" style="
                        background: linear-gradient(135deg, #059669, #047857);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 160px;
                    ">✅ SÍ FUNCIONÓ</button>
                    
                    <button id="configFallida" style="
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        font-size: 18px;
                        font-weight: bold;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 160px;
                    ">❌ NO FUNCIONÓ</button>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                    Esta configuración se guardará para futuros pagos
                </p>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('#configExitosa').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(true);
        });

        modal.querySelector('#configFallida').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// ===== IMPRESIÓN AUTOMÁTICA TAS (DESPUÉS DE CONFIGURAR) =====
async function ejecutarImpresionTASAutomatica(datosTicket) {
    try {
        console.log('🚀 Ejecutando impresión TAS automática...');

        if (TAS_CONFIG.modoImpresion === 'manual') {
            return await mostrarModalImpresionManual(datosTicket);
        }

        // Mostrar notificación discreta
        mostrarNotificacionTAS('🖨️ Preparando comprobante...', 'info');

        // Crear contenido optimizado
        const contenidoHTML = generarHTMLComprobanteTAS(datosTicket);

        // Iframe invisible para impresión rápida
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

                    console.log('✅ Impresión TAS automática ejecutada');

                    // Notificación de éxito discreta
                    setTimeout(() => {
                        mostrarNotificacionTAS(
                            '✅ Comprobante enviado a impresora',
                            'success'
                        );
                    }, 1000);

                    // Limpiar después de 3 segundos
                    setTimeout(() => {
                        try {
                            document.body.removeChild(iframe);
                        } catch (e) {}
                        resolve(true);
                    }, 3000);
                } catch (error) {
                    console.error(
                        '❌ Error en impresión automática TAS:',
                        error
                    );
                    try {
                        document.body.removeChild(iframe);
                    } catch (e) {}
                    resolve(false);
                }
            }, 500);
        });
    } catch (error) {
        console.error('❌ Error en impresión TAS automática:', error);
        return false;
    }
}

// ===== MODAL IMPRESIÓN MANUAL =====
async function mostrarModalImpresionManual(datosTicket) {
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
                <h2 style="font-size: 24px; margin: 0 0 15px 0;">Comprobante Listo</h2>
                <p style="font-size: 16px; margin-bottom: 20px; opacity: 0.9;">
                    Factura N° ${datosTicket.factura}<br>
                    Importe: <strong>$${parseFloat(
                        datosTicket.importe
                    ).toLocaleString('es-AR')}</strong>
                </p>

                <div style="
                    background: rgba(255,255,255,0.1);
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-size: 14px;
                ">
                    <strong>Modo Manual TAS:</strong><br>
                    Haz clic en IMPRIMIR y selecciona tu impresora
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
                    <button id="imprimirManual" style="
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
                    
                    <button id="cerrarManual" style="
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
            .querySelector('#imprimirManual')
            .addEventListener('click', async () => {
                const exitoso = await ejecutarImpresionTASAutomatica(
                    datosTicket
                );
                document.body.removeChild(modal);
                resolve(exitoso);
            });

        modal.querySelector('#cerrarManual').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// ===== IMPRESIÓN ESTÁNDAR (NO TAS) =====
async function impresionEstandarNavegador(datosTicket) {
    try {
        console.log('🖨️ Impresión estándar (no TAS)');

        const contenidoHTML = generarHTMLComprobanteEstandar(datosTicket);

        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            position: fixed;
            left: 50%;
            top: 50%;
            width: 400px;
            height: 500px;
            transform: translate(-50%, -50%);
            border: 2px solid #059669;
            border-radius: 10px;
            z-index: 999999;
            background: white;
        `;

        document.body.appendChild(iframe);

        const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(contenidoHTML);
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            setTimeout(() => {
                try {
                    document.body.removeChild(iframe);
                } catch (e) {}
            }, 3000);
        }, 1000);

        return true;
    } catch (error) {
        console.error('❌ Error en impresión estándar:', error);
        return false;
    }
}

// ===== GENERAR HTML PRUEBA TAS =====
function generarHTMLPruebaTAS(datosTicket) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Configuración TAS</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
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
                    font-size: 14px;
                    margin-bottom: 3mm;
                }
                .separator {
                    border-top: 1px dashed #000;
                    margin: 2mm 0;
                }
                .test-section {
                    text-align: center;
                    margin: 3mm 0;
                    padding: 2mm;
                    border: 1px solid #000;
                }
            </style>
        </head>
        <body>
            <div class="header">
                🏪 CONFIGURACIÓN TAS<br>
                COOPERATIVA POPULAR
            </div>
            
            <div class="separator"></div>
            
            <div class="test-section">
                <strong>✅ PRUEBA DE IMPRESIÓN</strong><br>
                ${new Date().toLocaleString('es-AR')}
            </div>
            
            <div class="separator"></div>
            
            <div style="font-size: 10px; text-align: center;">
                Terminal: ${window.location.hostname}<br>
                Factura de prueba: ${datosTicket.factura}<br>
                Cliente: ${datosTicket.cliente}
            </div>
            
            <div class="separator"></div>
            
            <div style="text-align: center; font-weight: bold;">
                Si ves este texto,<br>
                ¡la impresora funciona!
            </div>
        </body>
        </html>
    `;
}

// ===== GENERAR HTML COMPROBANTE TAS =====
function generarHTMLComprobanteTAS(datosTicket) {
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
                @page { size: 80mm auto; margin: 0; }
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
                ${parseFloat(importe).toLocaleString('es-AR')}
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

// ===== GENERAR HTML COMPROBANTE ESTÁNDAR =====
function generarHTMLComprobanteEstandar(datosTicket) {
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
            <title>Comprobante de Pago</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 20px;
                    background: white;
                    color: #000;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #059669;
                    color: white;
                    border-radius: 8px;
                }
                .section {
                    margin: 15px 0;
                    padding: 10px;
                    border: 1px solid #e5e7eb;
                    border-radius: 5px;
                }
                .amount {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f0f9ff;
                    border-radius: 8px;
                    border: 2px solid #059669;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    color: #059669;
                    font-weight: bold;
                }
                @media print {
                    body { margin: 0; }
                    .header { background: #059669 !important; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2 style="margin: 0;">COOPERATIVA POPULAR</h2>
                <p style="margin: 5px 0 0 0;">COMPROBANTE DE PAGO</p>
            </div>
            
            <div class="section">
                <strong>CLIENTE:</strong><br>
                ${cliente}<br>
                NIS: ${nis}
            </div>
            
            <div class="section">
                <strong>FACTURA:</strong><br>
                Número: ${factura}<br>
                Vencimiento: ${vencimiento}<br>
                Fecha Vto: ${fecha}
            </div>
            
            <div class="section">
                <strong>PAGO:</strong><br>
                Método: ${metodoPago}<br>
                Fecha: ${fechaPago}<br>
                ID: ${transactionId}
            </div>
            
            <div class="amount">
                IMPORTE PAGADO<br>
                ${parseFloat(importe).toLocaleString('es-AR')}
            </div>
            
            <div class="footer">
                ✅ PAGO PROCESADO EXITOSAMENTE<br>
                Gracias por su pago<br><br>
                ${new Date().toLocaleString('es-AR')}
            </div>
        </body>
        </html>
    `;
}

// ===== NOTIFICACIÓN DISCRETA TAS =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    // Remover notificación anterior
    const anterior = document.getElementById('toast-tas');
    if (anterior) {
        try {
            document.body.removeChild(anterior);
        } catch (e) {}
    }

    const colores = {
        success: '#059669',
        error: '#dc2626',
        info: '#2563eb',
        warning: '#d97706',
    };

    const toast = document.createElement('div');
    toast.id = 'toast-tas';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colores[tipo]};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 999999;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        font-family: Arial, sans-serif;
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
            const elemento = document.getElementById('toast-tas');
            if (elemento) {
                document.body.removeChild(elemento);
            }
            document.head.removeChild(style);
        } catch (e) {}
    }, 4000);
}

// ===== FUNCIONES AUXILIARES PARA EXPORTAR =====

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

export async function imprimirTicketError(datosTicketError) {
    console.log('🖨️ Ticket de error - usando sistema TAS');
    return await imprimirTicketDesdeNavegador(datosTicketError);
}

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

// ===== FUNCIONES DE ADMINISTRACIÓN TAS =====

// Habilitar modo TAS manualmente
export function habilitarModoTAS() {
    if (!isClient) {
        console.warn('⚠️ No se puede habilitar modo TAS en el servidor');
        return false;
    }

    localStorage.setItem('TAS_MODE', 'true');
    localStorage.setItem('tas-modo-impresion', 'auto');
    TAS_CONFIG.esTAS = true;
    TAS_CONFIG.modoImpresion = 'auto';
    console.log('🏪 Modo TAS habilitado');
    mostrarNotificacionTAS('🏪 Modo TAS habilitado', 'success');
    return true;
}

// Deshabilitar modo TAS
export function deshabilitarModoTAS() {
    if (!isClient) {
        console.warn('⚠️ No se puede deshabilitar modo TAS en el servidor');
        return false;
    }

    localStorage.removeItem('TAS_MODE');
    localStorage.removeItem('tas-impresora-ok');
    localStorage.removeItem('tas-modo-impresion');
    localStorage.removeItem('tas-config-fecha');
    TAS_CONFIG.esTAS = false;
    TAS_CONFIG.impresoraConfigurada = false;
    TAS_CONFIG.modoImpresion = 'auto';
    console.log('🖥️ Modo TAS deshabilitado');
    mostrarNotificacionTAS('🖥️ Modo TAS deshabilitado', 'info');
    return true;
}

// Resetear configuración TAS
export function resetearConfiguracionTAS() {
    if (!isClient) {
        console.warn(
            '⚠️ No se puede resetear configuración TAS en el servidor'
        );
        return false;
    }

    localStorage.removeItem('tas-impresora-ok');
    localStorage.removeItem('tas-config-fecha');
    TAS_CONFIG.impresoraConfigurada = false;
    console.log('🔄 Configuración TAS reseteada');
    mostrarNotificacionTAS('🔄 Configuración TAS reseteada', 'warning');
    return true;
}

// Verificar estado TAS
export function verificarEstadoTAS() {
    if (!isClient) {
        return {
            error: 'No disponible en el servidor',
            isServer: true,
        };
    }

    const estado = {
        esTAS: TAS_CONFIG.esTAS,
        configurado: TAS_CONFIG.impresoraConfigurada,
        modo: TAS_CONFIG.modoImpresion,
        fechaConfig: localStorage.getItem('tas-config-fecha'),
        hostname: window.location.hostname,
        userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Otro',
    };

    console.log('📊 Estado TAS:', estado);
    return estado;
}

// Cambiar modo de impresión
export function cambiarModoImpresion(nuevoModo) {
    if (!isClient) {
        console.warn('⚠️ No se puede cambiar modo de impresión en el servidor');
        return false;
    }

    if (['auto', 'manual', 'deshabilitado'].includes(nuevoModo)) {
        localStorage.setItem('tas-modo-impresion', nuevoModo);
        TAS_CONFIG.modoImpresion = nuevoModo;
        console.log(`🔧 Modo de impresión cambiado a: ${nuevoModo}`);
        mostrarNotificacionTAS(`🔧 Modo: ${nuevoModo}`, 'info');
        return true;
    }
    return false;
}

// Testing
export async function testImpresion() {
    const datosTest = {
        cliente: 'CLIENTE TEST TAS',
        nis: '48970000001',
        factura: '1155816',
        fecha: '14/01/2025',
        importe: '20000',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        transactionId: 'TEST_TAS_' + Date.now(),
        fechaPago: new Date().toLocaleString('es-AR'),
    };

    await imprimirTicketDesdeNavegador(datosTest);
}
