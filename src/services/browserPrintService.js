// browserPrintService.js - SOLUCIÓN FINAL PARA TAS

import Swal from 'sweetalert2';

// ===== CONFIGURACIÓN DEL SERVICIO TAS =====
const TAS_SERVICE_CONFIG = {
    url: '/api/imprimir-tas', // API del servidor principal
    timeout: 5000,
};

// ===== DETECTAR IP LOCAL AUTOMÁTICAMENTE =====
// Versión simplificada que siempre retorna la IP del TAS
async function obtenerIPLocal() {
    // IP fija del TAS - solución temporal
    const IP_TAS = '192.168.1.57';
    localStorage.setItem('tas-ip-local', IP_TAS);
    console.log('📍 Usando IP fija TAS:', IP_TAS);
    return IP_TAS;
}

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN REAL SIN DIÁLOGOS =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ Enviando a servicio TAS...', datosTicket);

        // Obtener IP local del cliente
        const ipLocal = await obtenerIPLocal();
        console.log('📍 IP detectada:', ipLocal);

        // Enviar al backend con la IP del cliente
        const exitosoTAS = await enviarAServicioTAS(datosTicket, ipLocal);
        if (exitosoTAS) {
            mostrarNotificacionTAS(
                '✅ Comprobante impreso automáticamente',
                'success'
            );
            return true;
        }

        // Si falla, mostrar instrucciones
        await mostrarInstruccionesServicioTAS(datosTicket);
        return false;
    } catch (error) {
        console.error('❌ Error en impresión TAS:', error);
        await mostrarInstruccionesServicioTAS(datosTicket);
        return false;
    }
}

// ===== ENVIAR A SERVICIO TAS A TRAVÉS DEL BACKEND =====
async function enviarAServicioTAS(datosTicket, ipTAS) {
    try {
        console.log('📡 Enviando al backend para reenvío a TAS...');

        const response = await fetch(TAS_SERVICE_CONFIG.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ipTAS: ipTAS, // IP del cliente TAS
                datos: datosTicket, // Datos del ticket
            }),
            signal: AbortSignal.timeout(TAS_SERVICE_CONFIG.timeout),
        });

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ Impresión exitosa via backend:', resultado);
            return true;
        } else {
            console.log('❌ Backend respondió con error:', response.status);
            return false;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ Timeout conectando con backend');
        } else {
            console.log('❌ Error conectando con backend:', error.message);
        }
        return false;
    }
}

// ===== VERIFICAR ESTADO DEL SERVICIO TAS =====
export async function verificarServicioTAS() {
    try {
        const ipLocal = await obtenerIPLocal();

        const response = await fetch(TAS_SERVICE_CONFIG.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ipTAS: ipLocal,
                datos: { test: true },
            }),
            signal: AbortSignal.timeout(3000),
        });

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

// ===== CONFIGURAR IP MANUALMENTE =====
export async function configurarIPTAS() {
    const { value: nuevaIP } = await Swal.fire({
        title: '🌐 Configurar IP del Terminal TAS',
        html: `
            <div style="text-align: left; padding: 20px;">
                <p>Ingresa la IP local de este terminal TAS:</p>
                <p style="font-size: 12px; color: #666;">
                    Para encontrarla, abre CMD y ejecuta: <code>ipconfig</code>
                </p>
            </div>
        `,
        input: 'text',
        inputPlaceholder: '192.168.1.12',
        inputValue: await obtenerIPLocal(),
        showCancelButton: true,
        confirmButtonText: '💾 Guardar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || !/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
                return 'Ingresa una IP válida (ej: 192.168.1.12)';
            }
        },
    });

    if (nuevaIP) {
        localStorage.setItem('tas-ip-local', nuevaIP);
        mostrarNotificacionTAS(`✅ IP configurada: ${nuevaIP}`, 'success');
        return nuevaIP;
    }
}

// ===== MOSTRAR INSTRUCCIONES SERVICIO TAS =====
async function mostrarInstruccionesServicioTAS(datosTicket) {
    const ipActual = await obtenerIPLocal();

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
                    El pago fue <strong>exitoso</strong>, pero el servicio de impresión no responde.
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
                        <p style="margin: 8px 0;"><strong>3.</strong> Verificar que diga "puerto 9100"</p>
                        <p style="margin: 8px 0;"><strong>4.</strong> Reintentar el pago</p>
                    </div>
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
                        }</strong> - $${parseFloat(
            datosTicket.importe
        ).toLocaleString('es-AR')}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">
                        IP detectada: ${ipActual}
                    </p>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px; flex-wrap: wrap;">
                    <button id="verificarServicio" style="
                        background: #2563eb;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 140px;
                    ">🔍 VERIFICAR</button>
                    
                    <button id="configurarIP" style="
                        background: #d97706;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 140px;
                    ">🌐 CONFIG IP</button>
                    
                    <button id="continuarSinServicio" style="
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: bold;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 140px;
                    ">CONTINUAR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Botón verificar servicio
        modal
            .querySelector('#verificarServicio')
            .addEventListener('click', async () => {
                const btn = modal.querySelector('#verificarServicio');
                btn.innerHTML = '🔄 VERIFICANDO...';
                btn.disabled = true;

                const estado = await verificarServicioTAS();
                if (estado) {
                    btn.innerHTML = '✅ ONLINE';
                    btn.style.background = '#059669';

                    setTimeout(async () => {
                        document.body.removeChild(modal);
                        const exitoso = await enviarAServicioTAS(
                            datosTicket,
                            ipActual
                        );
                        if (exitoso) {
                            mostrarNotificacionTAS(
                                '✅ Comprobante impreso automáticamente',
                                'success'
                            );
                        }
                        resolve(exitoso);
                    }, 1500);
                } else {
                    btn.innerHTML = '❌ OFFLINE';
                    btn.style.background = '#dc2626';
                    btn.disabled = false;
                }
            });

        // Botón configurar IP
        modal
            .querySelector('#configurarIP')
            .addEventListener('click', async () => {
                const nuevaIP = await configurarIPTAS();
                if (nuevaIP) {
                    modal.querySelector(
                        '.opacity-80'
                    ).textContent = `IP detectada: ${nuevaIP}`;
                }
            });

        // Botón continuar
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

// ===== FUNCIONES AUXILIARES =====
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

// ===== TESTING =====
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

// ===== DIAGNÓSTICO =====
export async function diagnosticoTAS() {
    console.log('🔍 === DIAGNÓSTICO TAS ===');
    const ipLocal = await obtenerIPLocal();
    console.log('IP Local:', ipLocal);

    const estado = await verificarServicioTAS();
    console.log('Estado TAS:', estado ? '✅ Online' : '❌ Offline');

    return { ip: ipLocal, estado };
}
