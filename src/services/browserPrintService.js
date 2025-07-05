// browserPrintService.js - CLIENTE PARA SERVICIO TAS

import Swal from 'sweetalert2';

// ===== CONFIGURACIÓN DEL SERVICIO TAS =====
const TAS_SERVICE_CONFIG = {
    url: 'http://localhost:9100',
    endpoints: {
        imprimir: '/imprimir',
        estado: '/estado',
        test: '/test',
    },
    timeout: 5000,
};

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN REAL SIN DIÁLOGOS =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Enviando a servicio TAS local...', datosTicket);

        // ✅ MÉTODO 1: Servicio TAS Local (SIN DIÁLOGOS)
        const exitosoTAS = await enviarAServicioTAS(datosTicket);
        if (exitosoTAS) {
            mostrarNotificacionTAS(
                '✅ Comprobante impreso automáticamente',
                'success'
            );
            return true;
        }

        // ❌ SERVICIO NO DISPONIBLE: Mostrar instrucciones
        await mostrarInstruccionesServicioTAS(datosTicket);
        return false;
    } catch (error) {
        console.error('❌ Error en impresión TAS:', error);
        await mostrarInstruccionesServicioTAS(datosTicket);
        return false;
    }
}

// ===== ENVIAR A SERVICIO TAS LOCAL =====
async function enviarAServicioTAS(datosTicket) {
    try {
        console.log('📡 Conectando con servicio TAS local...');

        const response = await fetch(
            `${TAS_SERVICE_CONFIG.url}${TAS_SERVICE_CONFIG.endpoints.imprimir}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(datosTicket),
                signal: AbortSignal.timeout(TAS_SERVICE_CONFIG.timeout),
            }
        );

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ Impresión exitosa via servicio TAS:', resultado);
            return true;
        } else {
            console.log(
                '❌ Servicio TAS respondió con error:',
                response.status
            );
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ Timeout conectando con servicio TAS');
        } else if (error.message.includes('fetch')) {
            console.log('🔌 Servicio TAS no disponible - no está ejecutándose');
        } else {
            console.log('❌ Error conectando con servicio TAS:', error.message);
        }
        return false;
    }
}

// ===== VERIFICAR ESTADO DEL SERVICIO TAS =====
export async function verificarServicioTAS() {
    try {
        const response = await fetch(
            `${TAS_SERVICE_CONFIG.url}${TAS_SERVICE_CONFIG.endpoints.estado}`,
            {
                method: 'GET',
                signal: AbortSignal.timeout(3000),
            }
        );

        if (response.ok) {
            const estado = await response.json();
            console.log('✅ Servicio TAS Online:', estado);
            return estado;
        } else {
            return null;
        }
    } catch (error) {
        console.log('🔌 Servicio TAS Offline');
        return null;
    }
}

// ===== PROBAR IMPRESIÓN TAS =====
export async function probarImpresionTAS() {
    try {
        console.log('🧪 Enviando prueba de impresión...');

        const response = await fetch(
            `${TAS_SERVICE_CONFIG.url}${TAS_SERVICE_CONFIG.endpoints.test}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(TAS_SERVICE_CONFIG.timeout),
            }
        );

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ Prueba de impresión exitosa:', resultado);
            mostrarNotificacionTAS('✅ Prueba de impresión exitosa', 'success');
            return true;
        } else {
            console.log('❌ Error en prueba de impresión');
            mostrarNotificacionTAS('❌ Error en prueba de impresión', 'error');
            return false;
        }
    } catch (error) {
        console.error('❌ Error probando impresión TAS:', error);
        mostrarNotificacionTAS('❌ Servicio TAS no disponible', 'error');
        return false;
    }
}

// ===== MOSTRAR INSTRUCCIONES SERVICIO TAS =====
async function mostrarInstruccionesServicioTAS(datosTicket) {
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
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                color: white;
                padding: 40px;
                border-radius: 20px;
                max-width: 600px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h2 style="font-size: 28px; margin: 0 0 20px 0;">Servicio TAS No Disponible</h2>
                <p style="font-size: 16px; margin-bottom: 25px; opacity: 0.9; line-height: 1.5;">
                    El pago fue <strong>exitoso</strong>, pero el servicio de impresión automática no está funcionando.
                </p>
                
                <div style="
                    background: rgba(255,255,255,0.1);
                    padding: 25px;
                    border-radius: 15px;
                    margin: 25px 0;
                    text-align: left;
                ">
                    <h3 style="margin: 0 0 15px 0; color: #fbbf24; font-size: 18px;">💡 Solución Rápida:</h3>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <p style="margin: 8px 0;"><strong>1.</strong> Buscar en el escritorio: <code>"TAS - Iniciar Servidor"</code></p>
                        <p style="margin: 8px 0;"><strong>2.</strong> Hacer doble clic para iniciar el servicio</p>
                        <p style="margin: 8px 0;"><strong>3.</strong> Reintentar el pago</p>
                    </div>
                </div>

                <div style="
                    background: rgba(59, 130, 246, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                ">
                    <h4 style="margin: 0 0 10px 0; color: #60a5fa;">🔧 Si no está instalado:</h4>
                    <p style="margin: 0; font-size: 14px;">
                        Contactar al administrador para instalar el servicio de impresión TAS
                    </p>
                </div>

                <div style="
                    background: rgba(34, 197, 94, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    margin: 20px 0;
                    border: 1px solid rgba(34, 197, 94, 0.3);
                ">
                    <h4 style="margin: 0 0 10px 0; color: #4ade80;">✅ Comprobante de Pago:</h4>
                    <p style="margin: 0; font-size: 14px;">
                        Factura N° <strong>${
                            datosTicket.factura
                        }</strong> - ${parseFloat(
            datosTicket.importe
        ).toLocaleString('es-AR')}
                    </p>
                </div>

                <div style="display: flex; gap: 20px; justify-content: center; margin-top: 30px;">
                    <button id="verificarServicio" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 15px 25px;
                        font-size: 16px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 180px;
                    ">🔍 VERIFICAR SERVICIO</button>
                    
                    <button id="continuarSinServicio" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 15px 25px;
                        font-size: 16px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 180px;
                    ">CONTINUAR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal
            .querySelector('#verificarServicio')
            .addEventListener('click', async () => {
                const btn = modal.querySelector('#verificarServicio');
                btn.innerHTML = '🔄 VERIFICANDO...';
                btn.disabled = true;

                const estado = await verificarServicioTAS();
                if (estado) {
                    btn.innerHTML = '✅ SERVICIO ONLINE';
                    btn.style.background = '#059669';

                    // Reintentar impresión
                    setTimeout(async () => {
                        document.body.removeChild(modal);
                        const exitoso = await enviarAServicioTAS(datosTicket);
                        if (exitoso) {
                            mostrarNotificacionTAS(
                                '✅ Comprobante impreso automáticamente',
                                'success'
                            );
                        }
                        resolve(exitoso);
                    }, 1500);
                } else {
                    btn.innerHTML = '❌ SERVICIO OFFLINE';
                    btn.style.background = '#dc2626';
                    btn.disabled = false;
                }
            });

        modal
            .querySelector('#continuarSinServicio')
            .addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(false);
            });
    });
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
    console.log('🖨️ Ticket de error - usando servicio TAS');
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

// ===== DIAGNÓSTICO TAS =====
export async function diagnosticoTAS() {
    console.log('🔍 === DIAGNÓSTICO TAS ===');

    // Verificar servicio
    const estado = await verificarServicioTAS();
    console.log('Servicio TAS:', estado ? '✅ Online' : '❌ Offline');

    // Verificar conectividad
    try {
        const response = await fetch('http://localhost:9100/estado', {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        console.log(
            'Puerto 9100:',
            response.ok ? '✅ Accesible' : '❌ No responde'
        );
    } catch (error) {
        console.log('Puerto 9100: ❌ No accesible');
    }

    // Verificar fecha/hora
    console.log('Timestamp:', new Date().toISOString());

    // Mostrar información del navegador
    console.log('User Agent:', navigator.userAgent);
    console.log('URL:', window.location.href);

    return estado;
}

// Testing
export async function testImpresion() {
    const datosTest = {
        cliente: 'CLIENTE TEST TAS',
        nis: '4958000004',
        factura: 'TEST001',
        fecha: '05/07/2025',
        importe: '1000',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        transactionId: 'TEST_' + Date.now(),
        fechaPago: new Date().toLocaleString('es-AR'),
    };

    await imprimirTicketDesdeNavegador(datosTest);
}

// ===== EXPORTAR CONFIGURACIÓN PARA DEBUG =====
export const TAS_CONFIG = TAS_SERVICE_CONFIG;
