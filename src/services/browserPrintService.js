// browserPrintService-VPN.js - SOLUCIÓN ESPECÍFICA PARA VPN

import Swal from 'sweetalert2';

// ===== CONFIGURACIÓN PARA ARQUITECTURA VPN =====
const VPN_TAS_CONFIG = {
    // El servidor backend actúa como proxy via VPN
    backendProxyUrl: 'http://10.10.5.222:3003/tas-coope/api/imprimir-tas/',
    // TAS-Central también puede ser usado como proxy
    centralProxyUrl: 'http://10.10.5.222:3002/imprimir',
    // IP de la TAS en la red VPN (IP asignada por OpenVPN)
    remoteTASIP: '10.10.5.26',
    remoteTASPort: 9100,
    timeout: 10000,
};

// ===== FUNCIÓN PRINCIPAL - IMPRESIÓN VIA VPN =====
export async function imprimirTicketDesdeNavegador(datosTicket) {
    try {
        console.log('🖨️ [VPN-TAS] Iniciando impresión via backend proxy...', datosTicket);

        // MÉTODO 1: Via Backend API (RECOMENDADO para VPN)
        const exitosoBackend = await enviarViaBackendProxy(datosTicket);
        if (exitosoBackend) {
            mostrarNotificacionTAS('✅ Ticket impreso via Backend Proxy', 'success');
            return true;
        }

        // MÉTODO 2: Via TAS-Central (ALTERNATIVO)
        console.log('🔄 [VPN-TAS] Backend falló, intentando TAS-Central...');
        const exitosoTASCentral = await enviarViaTASCentral(datosTicket);
        if (exitosoTASCentral) {
            mostrarNotificacionTAS('✅ Ticket impreso via TAS-Central', 'success');
            return true;
        }

        // MÉTODO 3: Mostrar instrucciones VPN
        await mostrarInstruccionesVPN(datosTicket);
        return false;

    } catch (error) {
        console.error('❌ [VPN-TAS] Error general:', error);
        await mostrarInstruccionesVPN(datosTicket);
        return false;
    }
}

// ===== MÉTODO 1: VIA BACKEND PROXY (PRINCIPAL) =====
async function enviarViaBackendProxy(datosTicket) {
    try {
        console.log('📡 [Backend-Proxy] Enviando via API backend...');

        const response = await fetch(VPN_TAS_CONFIG.backendProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-VPN-Target': VPN_TAS_CONFIG.remoteTASIP,
                'X-Client-Origin': window.location.origin,
                'X-Terminal-ID': localStorage.getItem('tas_terminal_id') || 'WEB_CLIENT'
            },
            body: JSON.stringify({
                ipTAS: VPN_TAS_CONFIG.remoteTASIP,
                datos: datosTicket,
                config: {
                    puerto: VPN_TAS_CONFIG.remoteTASPort,
                    via: 'vpn',
                    timestamp: new Date().toISOString()
                }
            }),
            signal: AbortSignal.timeout(VPN_TAS_CONFIG.timeout)
        });

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ [Backend-Proxy] Impresión exitosa:', resultado);
            return true;
        } else {
            const errorText = await response.text();
            console.log('❌ [Backend-Proxy] Error del servidor:', response.status, errorText);
            return false;
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⏰ [Backend-Proxy] Timeout de conexión');
        } else {
            console.log('❌ [Backend-Proxy] Error de conexión:', error.message);
        }
        return false;
    }
}

// ===== MÉTODO 2: VIA TAS-CENTRAL =====
async function enviarViaTASCentral(datosTicket) {
    try {
        console.log('📡 [TAS-Central] Enviando via TAS-Central proxy...');

        const response = await fetch(VPN_TAS_CONFIG.centralProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sucursal': 'CENTRAL',
                'X-VPN-Mode': 'true'
            },
            body: JSON.stringify({
                datos: datosTicket,
                configuracion: {
                    targetIP: VPN_TAS_CONFIG.remoteTASIP,
                    puerto: VPN_TAS_CONFIG.remoteTASPort,
                    via: 'vpn-central',
                    origen: 'webapp-vpn'
                }
            }),
            signal: AbortSignal.timeout(VPN_TAS_CONFIG.timeout)
        });

        if (response.ok) {
            const resultado = await response.json();
            console.log('✅ [TAS-Central] Impresión exitosa:', resultado);
            return true;
        } else {
            const errorText = await response.text();
            console.log('❌ [TAS-Central] Error:', response.status, errorText);
            return false;
        }

    } catch (error) {
        console.log('❌ [TAS-Central] Error de conexión:', error.message);
        return false;
    }
}

// ===== VERIFICAR CONECTIVIDAD VPN =====
export async function verificarConectividadVPN() {
    const resultados = {
        backend: false,
        tascentral: false,
        vpnStatus: 'unknown',
        timestamp: new Date().toISOString()
    };

    try {
        // Verificar Backend
        console.log('🔍 [VPN] Verificando conectividad backend...');
        const backendResponse = await fetch('http://10.10.5.222:3003/api/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        resultados.backend = backendResponse.ok;

        // Verificar TAS-Central
        console.log('🔍 [VPN] Verificando TAS-Central...');
        const centralResponse = await fetch('http://10.10.5.222:3002/status', {
            method: 'GET', 
            signal: AbortSignal.timeout(5000)
        });
        resultados.tascentral = centralResponse.ok;

        // Determinar estado VPN
        if (resultados.backend || resultados.tascentral) {
            resultados.vpnStatus = 'connected';
        } else {
            resultados.vpnStatus = 'disconnected';
        }

    } catch (error) {
        console.error('❌ [VPN] Error verificando conectividad:', error);
        resultados.vpnStatus = 'error';
    }

    console.log('📊 [VPN] Resultado de verificación:', resultados);
    return resultados;
}

// ===== INSTRUCCIONES ESPECÍFICAS PARA VPN =====
async function mostrarInstruccionesVPN(datosTicket) {
    const conectividad = await verificarConectividadVPN();
    
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.95); z-index: 999999; display: flex;
            align-items: center; justify-content: center; font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #dc2626, #b91c1c); color: white;
                padding: 40px; border-radius: 20px; max-width: 800px; text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">🔗⚠️</div>
                <h2 style="font-size: 28px; margin: 0 0 20px 0;">Problema de Conectividad VPN</h2>
                <p style="font-size: 16px; margin-bottom: 25px; opacity: 0.9;">
                    El pago fue <strong>exitoso</strong>, pero hay un problema con la conexión VPN para impresión.
                </p>
                
                <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; margin: 25px 0; text-align: left;">
                    <h3 style="margin: 0 0 15px 0; color: #fbbf24;">🔧 Estado de Conectividad:</h3>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <p style="margin: 8px 0;">
                            <strong>Backend (10.10.5.222:3003):</strong> 
                            <span style="color: ${conectividad.backend ? '#4ade80' : '#f87171'}">
                                ${conectividad.backend ? '✅ Conectado' : '❌ Sin conexión'}
                            </span>
                        </p>
                        <p style="margin: 8px 0;">
                            <strong>TAS-Central (10.10.5.222:3002):</strong> 
                            <span style="color: ${conectividad.tascentral ? '#4ade80' : '#f87171'}">
                                ${conectividad.tascentral ? '✅ Conectado' : '❌ Sin conexión'}
                            </span>
                        </p>
                        <p style="margin: 8px 0;">
                            <strong>VPN Status:</strong> 
                            <span style="color: ${conectividad.vpnStatus === 'connected' ? '#4ade80' : '#f87171'}">
                                ${conectividad.vpnStatus === 'connected' ? '✅ Activa' : '❌ Problema'}
                            </span>
                        </p>
                        <p style="margin: 8px 0;">
                            <strong>TAS Remoto:</strong> 10.10.5.26:9100 (via VPN)
                        </p>
                    </div>
                </div>

                <div style="background: rgba(255,255,255,0.1); padding: 25px; border-radius: 15px; margin: 25px 0; text-align: left;">
                    <h3 style="margin: 0 0 15px 0; color: #fbbf24;">🛠️ Soluciones por Orden:</h3>
                    <div style="font-size: 14px; line-height: 1.8;">
                        <p style="margin: 8px 0;"><strong>1. Servidor Backend:</strong> Verificar API /imprimir-tas en puerto 3003</p>
                        <p style="margin: 8px 0;"><strong>2. TAS-Central:</strong> Reiniciar servicio en puerto 3002</p>
                        <p style="margin: 8px 0;"><strong>3. VPN OpenVPN:</strong> Verificar túnel 10.10.5.222 ↔ 10.10.5.26</p>
                        <p style="margin: 8px 0;"><strong>4. TAS Remoto:</strong> Reiniciar "TAS - Iniciar Servidor"</p>
                        <p style="margin: 8px 0;"><strong>5. Firewall:</strong> Verificar puerto 9100 en ambos extremos</p>
                    </div>
                </div>

                <div style="background: rgba(34, 197, 94, 0.2); padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #4ade80;">✅ Comprobante de Pago:</h4>
                    <p style="margin: 0;">Factura <strong>${datosTicket.factura}</strong> - $${parseFloat(datosTicket.importe).toLocaleString('es-AR')}</p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.8;">Verificado: ${conectividad.timestamp}</p>
                </div>

                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 30px;">
                    <button id="verificarVPN" style="
                        background: #2563eb; color: white; border: none; padding: 12px 20px;
                        font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer;
                        transition: all 0.3s; min-width: 140px;
                    ">🔍 VERIFICAR VPN</button>
                    
                    <button id="abrirBackend" style="
                        background: #059669; color: white; border: none; padding: 12px 20px;
                        font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer;
                        transition: all 0.3s; min-width: 140px;
                    ">🖥️ BACKEND</button>
                    
                    <button id="abrirCentral" style="
                        background: #d97706; color: white; border: none; padding: 12px 20px;
                        font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer;
                        transition: all 0.3s; min-width: 140px;
                    ">🔗 TAS-CENTRAL</button>
                    
                    <button id="reintentarImpresion" style="
                        background: #7c3aed; color: white; border: none; padding: 12px 20px;
                        font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer;
                        transition: all 0.3s; min-width: 140px;
                    ">🔄 REINTENTAR</button>
                    
                    <button id="continuar" style="
                        background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);
                        padding: 12px 20px; font-size: 14px; font-weight: bold; border-radius: 8px;
                        cursor: pointer; transition: all 0.3s; min-width: 140px;
                    ">CONTINUAR</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('#verificarVPN').addEventListener('click', async () => {
            const btn = modal.querySelector('#verificarVPN');
            btn.innerHTML = '🔄 VERIFICANDO...';
            btn.disabled = true;

            const nuevaConectividad = await verificarConectividadVPN();
            
            if (nuevaConectividad.vpnStatus === 'connected') {
                btn.innerHTML = '✅ VPN OK';
                btn.style.background = '#059669';
                setTimeout(() => {
                    document.body.removeChild(modal);
                    // Reintentar impresión automáticamente
                    imprimirTicketDesdeNavegador(datosTicket);
                    resolve(true);
                }, 1500);
            } else {
                btn.innerHTML = '❌ VPN PROBLEM';
                btn.style.background = '#dc2626';
                btn.disabled = false;
                
                // Actualizar estado en la modal
                console.log('🔄 Actualizando estado VPN:', nuevaConectividad);
            }
        });

        modal.querySelector('#abrirBackend').addEventListener('click', () => {
            window.open('http://10.10.5.222:3003/api/health', '_blank');
        });

        modal.querySelector('#abrirCentral').addEventListener('click', () => {
            window.open('http://10.10.5.222:3002/status', '_blank');
        });

        modal.querySelector('#reintentarImpresion').addEventListener('click', async () => {
            document.body.removeChild(modal);
            const exito = await imprimirTicketDesdeNavegador(datosTicket);
            resolve(exito);
        });

        modal.querySelector('#continuar').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(false);
        });
    });
}

// ===== NOTIFICACIÓN MEJORADA =====
function mostrarNotificacionTAS(mensaje, tipo = 'success') {
    const anterior = document.getElementById('toast-tas-vpn');
    if (anterior) {
        try { document.body.removeChild(anterior); } catch(e) {}
    }

    const colores = {
        success: '#059669',
        error: '#dc2626', 
        info: '#2563eb',
        warning: '#d97706'
    };

    const toast = document.createElement('div');
    toast.id = 'toast-tas-vpn';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${colores[tipo]};
        color: white; padding: 15px 25px; border-radius: 8px; z-index: 999999;
        font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.3s ease-out; max-width: 350px;
        font-family: Arial, sans-serif;
    `;
    toast.textContent = `🔗 VPN: ${mensaje}`;

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
            const elemento = document.getElementById('toast-tas-vpn');
            if (elemento) document.body.removeChild(elemento);
            document.head.removeChild(style);
        } catch(e) {}
    }, 5000);
}

// ===== FUNCIONES AUXILIARES =====
export function prepararDatosTicket(factura, nis, cliente, paymentData, transactionId, metodoPago = 'MODO') {
    return {
        cliente: cliente.NOMBRE || 'Cliente',
        nis: nis,
        factura: factura,
        fecha: paymentData.fecha,
        importe: paymentData.importe,
        vencimiento: paymentData.vencimiento === '1' ? '1° Vencimiento' : '2° Vencimiento',
        metodoPago: metodoPago.toUpperCase(),
        transactionId: transactionId,
        fechaPago: new Date().toLocaleString('es-AR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        }),
        // Metadatos VPN
        viaVPN: true,
        remoteTAS: VPN_TAS_CONFIG.remoteTASIP,
        terminalId: localStorage.getItem('tas_terminal_id'),
        timestamp: new Date().toISOString()
    };
}

// ===== TESTING VPN =====
export async function testImpresionVPN() {
    const datosTest = {
        cliente: 'CLIENTE TEST VPN',
        nis: '4958000004', 
        factura: 'VPN_TEST001',
        fecha: '08/07/2025',
        importe: '1500',
        vencimiento: '1° Vencimiento',
        metodoPago: 'TEST_VPN',
        transactionId: 'VPN_TEST_' + Date.now(),
        fechaPago: new Date().toLocaleString('es-AR')
    };

    console.log('🧪 [VPN-TAS] Iniciando test de impresión VPN...');
    return await imprimirTicketDesdeNavegador(datosTest);
}

export async function diagnosticoVPN() {
    console.log('🔍 === DIAGNÓSTICO VPN TAS ===');
    
    const conectividad = await verificarConectividadVPN();
    
    console.log('🔗 VPN Status:', conectividad.vpnStatus);
    console.log('🖥️ Backend:', conectividad.backend ? '✅ OK' : '❌ FAIL');
    console.log('🔗 TAS-Central:', conectividad.tascentral ? '✅ OK' : '❌ FAIL');
    console.log('🎯 Target TAS:', VPN_TAS_CONFIG.remoteTASIP + ':' + VPN_TAS_CONFIG.remoteTASPort);
    console.log('⚙️ Config VPN:', VPN_TAS_CONFIG);
    
    return { conectividad, config: VPN_TAS_CONFIG };
}

// ===== EXPORT FUNCIONES DE ERROR =====
export async function imprimirTicketError(datosTicketError) {
    console.log('🖨️ [VPN] Ticket de error - usando proxy VPN');
    return await imprimirTicketDesdeNavegador(datosTicketError);
}