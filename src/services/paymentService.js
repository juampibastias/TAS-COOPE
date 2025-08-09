import Swal from 'sweetalert2';
import { validatePaymentStatus } from './facturaService';
import { startPolling } from './modoPollingService';
import {
    imprimirTicketDesdeNavegador,
    prepararDatosTicket,
} from './browserPrintService';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// ===== FUNCIONES AUXILIARES PARA ALERTAS =====
const showLoadingAlert = (title, text) => {
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
    });
};

const showInfoAlert = (title, text) => {
    return Swal.fire({
        icon: 'info',
        title,
        text,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#059669',
    });
};

const showErrorAlert = (title, text) => {
    return Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#dc2626',
    });
};

const showSuccessAlert = (title, text) => {
    return Swal.fire({
        icon: 'success',
        title,
        text,
        confirmButtonText: 'Continuar',
        confirmButtonColor: '#059669',
        allowOutsideClick: false,
    });
};

// ===== FUNCIONES DE IMPRESIÓN =====

// 🔥 FUNCIÓN CORREGIDA - Solo para pagos exitosos
const imprimirTicketExito = async (
    paymentData,
    nis,
    cliente,
    metodoPago,
    transactionId
) => {
    // 🔥 PARCHE ANTI-DUPLICADO - AGREGAR ESTAS 4 LÍNEAS:
    const ticketKey = `${paymentData.factura}_${transactionId}`;
    if (window.ticketImpreso === ticketKey) {
        console.log('🚫 Ticket ya impreso, evitando duplicado');
        return;
    }
    window.ticketImpreso = ticketKey;
    // 🔥 FIN DEL PARCHE
    try {
        console.log('🖨️ Iniciando impresión de ticket exitoso...');

        const datosTicket = prepararDatosTicket(
            paymentData.factura,
            nis,
            cliente,
            paymentData,
            transactionId,
            metodoPago
        );

        await imprimirTicketDesdeNavegador(datosTicket);
        console.log('✅ Ticket de éxito impreso correctamente');
    } catch (error) {
        console.error('❌ Error al imprimir ticket de éxito:', error);
        // No bloquear el flujo por error de impresión
        Swal.fire({
            icon: 'warning',
            title: 'Error de impresión',
            text: 'El pago fue exitoso pero no se pudo imprimir el comprobante.',
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#059669',
            timer: 3000,
        });
    }
};

// 🔥 FUNCIÓN DESHABILITADA - NO IMPRIMIR FALLOS/CANCELACIONES
const imprimirTicketFallo = async (...args) => {
    console.log('🚫 [SEGURIDAD] Impresión de fallo/cancelación deshabilitada');
    return Promise.resolve();
};

// ===== FUNCIÓN PARA OBTENER DATOS DEL CLIENTE =====
const obtenerDatosCliente = async (nis) => {
    try {
        const response = await fetch(`${baseUrl}/api/cliente?nis=${nis}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-cache',
        });

        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('❌ Error obteniendo datos del cliente:', error);
    }

    return { NOMBRE: 'Cliente' }; // Fallback
};

// ===== FUNCIÓN PARA REFRESCAR ESTADO DE FACTURAS =====
const refreshFacturasState = async (nis) => {
    try {
        console.log('🔄 Refrescando estado de facturas para NIS:', nis);

        const response = await fetch(`${baseUrl}/api/facturas?nis=${nis}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                Pragma: 'no-cache',
            },
            cache: 'no-cache',
        });

        if (response.ok) {
            const updatedFacturas = await response.json();

            // Disparar evento personalizado para actualizar componentes
            window.dispatchEvent(
                new CustomEvent('facturasUpdated', {
                    detail: { facturas: updatedFacturas, nis },
                })
            );

            console.log('✅ Estado de facturas actualizado:', updatedFacturas);
            return updatedFacturas;
        } else {
            console.warn(
                '⚠️ Error al refrescar facturas:',
                response.statusText
            );
        }
    } catch (error) {
        console.error('❌ Error al refrescar estado de facturas:', error);
    }
    return null;
};

// ===== SELECTOR DE MÉTODO DE PAGO =====
const showPaymentMethodSelector = async () => {
    const metodoModoHabilitado =
        process.env.NEXT_PUBLIC_MODO_ENABLED === 'true';
    const metodoMPHabilitado =
        process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true';

    const { value: metodoPago } = await Swal.fire({
        title: 'Selecciona un método de pago',
        html: `
          <div style="text-align: left; font-size: 18px;">
            <label style="${
                metodoMPHabilitado
                    ? 'color: #009ee3; font-weight: bold;'
                    : 'color: grey;'
            }; display: block; margin-bottom: 15px; padding: 15px; border: 2px solid ${
            metodoMPHabilitado ? '#009ee3' : '#ccc'
        }; border-radius: 8px; cursor: ${
            metodoMPHabilitado ? 'pointer' : 'not-allowed'
        };">
              <input type="radio" name="metodoPago" value="mercadopago" ${
                  metodoMPHabilitado ? '' : 'disabled'
              } style="margin-right: 10px; transform: scale(1.3);">
              💳 MercadoPago
            </label>
            <label style="${
                metodoModoHabilitado
                    ? 'color: #059669; font-weight: bold;'
                    : 'color: grey;'
            }; display: block; padding: 15px; border: 2px solid ${
            metodoModoHabilitado ? '#059669' : '#ccc'
        }; border-radius: 8px; cursor: ${
            metodoModoHabilitado ? 'pointer' : 'not-allowed'
        };">
              <input type="radio" name="metodoPago" value="modo" ${
                  metodoModoHabilitado ? '' : 'disabled'
              } style="margin-right: 10px; transform: scale(1.3);">
              📱 MODO ${metodoModoHabilitado ? '' : '(Próximamente)'}
            </label>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#dc2626',
        width: 500,
        preConfirm: () => {
            const selected = document.querySelector(
                'input[name="metodoPago"]:checked'
            );
            if (!selected) {
                Swal.showValidationMessage(
                    'Debes seleccionar un método de pago!'
                );
            }
            return selected ? selected.value : null;
        },
    });

    return metodoPago;
};

// ===== QR DISPLAYS =====
const showModoQR = (data, onCancel = null) => {
    Swal.fire({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <h3 style="margin-bottom: 20px; color: #059669; font-size: 24px;">Escaneá con tu app MODO</h3>
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  data.qr
              )}&size=300x300" 
              alt="QR MODO" 
              style="display: block; margin: 0 auto; border: 4px solid #059669; border-radius: 15px; box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3);" 
            />
            <p style="margin-top:10px;font-size:16px;text-align:center; color: #059669; font-weight: bold;">
              ⏱️ Esperando confirmación...
            </p>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#dc2626',
        width: 500,
        allowOutsideClick: false,
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel && onCancel) {
            onCancel();
        }
    });
};

// ✅ QR MERCADOPAGO CON DETECCIÓN REAL DE ESCANEO
const showMercadoPagoQR = (data, onCancel = null) => {
    const swalInstance = Swal.fire({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <h3 style="margin-bottom: 20px; color: #009ee3; font-size: 24px;">Escaneá con tu app MercadoPago</h3>
            <img 
              src="${data.qr_url}" 
              alt="QR MercadoPago" 
              style="display: block; margin: 0 auto; border: 4px solid #009ee3; border-radius: 15px; box-shadow: 0 8px 25px rgba(0, 158, 227, 0.3);" 
            />
            <p id="qr-status" style="margin-top:10px;font-size:16px;text-align:center; color: #009ee3; font-weight: bold;">
              📱 Escaneá y pagá desde tu app
            </p>
            <div id="qr-progress" style="margin-top: 10px; display: none;">
              <div style="width: 200px; height: 4px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
                <div id="progress-bar" style="width: 0%; height: 100%; background-color: #009ee3; transition: width 0.3s ease;"></div>
              </div>
              <p style="font-size: 12px; color: #666; margin-top: 5px; text-align: center;">Confirma el pago en tu app...</p>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#dc2626',
        width: 500,
        allowOutsideClick: false,
        didOpen: () => {
            // ✅ INICIAR DETECCIÓN REAL DE ESCANEO
            if (data.preference_id) {
                startRealQRScanDetection(data.preference_id);
            }
        },
    });

    swalInstance.then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel && onCancel) {
            onCancel();
        }
    });

    return swalInstance;
};

// ✅ DETECCIÓN REAL DE ESCANEO VIA WEBHOOK
const startRealQRScanDetection = (preferenceId) => {
    let scanDetected = false;
    let scanCheckInterval;

    console.log(
        '🔍 Iniciando detección real de escaneo QR para preference:',
        preferenceId
    );

    // ✅ VERIFICAR ESCANEO CADA 2 SEGUNDOS VIA ENDPOINT
    scanCheckInterval = setInterval(async () => {
        if (scanDetected) return;

        try {
            const response = await fetch(
                `${baseUrl}/api/qr-scan-status/${preferenceId}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-cache',
                }
            );

            if (response.ok) {
                const scanStatus = await response.json();

                if (scanStatus.scanned && !scanDetected) {
                    console.log(
                        '📱 ¡QR ESCANEADO DETECTADO VIA WEBHOOK!',
                        scanStatus
                    );
                    markQRAsScanned();
                }
            }
        } catch (error) {
            console.warn('⚠️ Error verificando escaneo QR:', error);
        }
    }, 2000); // Cada 2 segundos

    // ✅ FUNCIÓN PARA MARCAR QR COMO ESCANEADO
    const markQRAsScanned = () => {
        if (scanDetected) return;

        scanDetected = true;
        console.log('✅ QR marcado como escaneado');

        const statusElement = document.getElementById('qr-status');
        const progressElement = document.getElementById('qr-progress');
        const progressBar = document.getElementById('progress-bar');

        if (statusElement) {
            statusElement.innerHTML =
                '✅ QR escaneado - Confirma el pago en tu app';
            statusElement.style.color = '#059669';
        }

        if (progressElement) {
            progressElement.style.display = 'block';
        }

        // ✅ ANIMACIÓN DE PROGRESO
        if (progressBar) {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 2;
                progressBar.style.width = `${Math.min(progress, 90)}%`;

                if (progress >= 90) {
                    clearInterval(progressInterval);
                }
            }, 150);

            window.qrProgressInterval = progressInterval;
        }

        cleanup();
    };

    // ✅ FUNCIÓN PARA LIMPIAR
    const cleanup = () => {
        if (scanCheckInterval) {
            clearInterval(scanCheckInterval);
        }

        // Limpiar tracking en el servidor
        if (preferenceId) {
            fetch(`${baseUrl}/api/qr-scan-tracker/${preferenceId}`, {
                method: 'DELETE',
            }).catch((err) => console.warn('⚠️ Error limpiando tracker:', err));
        }
    };

    // ✅ FUNCIÓN PÚBLICA PARA MARCAR PAGO COMPLETADO
    window.markQRPaymentCompleted = () => {
        const progressBar = document.getElementById('progress-bar');
        const statusElement = document.getElementById('qr-status');

        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.style.backgroundColor = '#059669';
        }

        if (statusElement) {
            statusElement.innerHTML = '🎉 ¡Pago confirmado!';
            statusElement.style.color = '#059669';
        }

        if (window.qrProgressInterval) {
            clearInterval(window.qrProgressInterval);
        }

        cleanup();
    };

    // Guardar cleanup para llamar externamente
    window.qrCleanup = cleanup;
};

// ✅ FUNCIÓN DE POLLING MERCADOPAGO CON IMPRESIÓN AUTOMÁTICA
const startMercadoPagoPolling = async (
    paymentData,
    nis,
    metodoPago,
    cliente,
    onSuccess,
    onCancel
) => {
    console.log(
        `🔄 Iniciando polling MercadoPago para factura ${paymentData.factura}, NIS ${nis}, vencimiento ${paymentData.vencimiento}`
    );

    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (cada 5 segundos)
    let estadoInicial = null;
    let paymentIdInicial = null;

    const pollInterval = setInterval(async () => {
        attempts++;
        console.log(
            `🔄 Polling MP intento ${attempts}/${maxAttempts} - Vencimiento ${paymentData.vencimiento}`
        );

        try {
            // 🎯 USAR EL ENDPOINT EXISTENTE (igual que MODO)
            const response = await fetch(`${baseUrl}/api/modo/payment-status?factura=${paymentData.factura}&nis=${nis}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
                cache: 'no-cache',
            });

            if (response.ok) {
                const data = await response.json();
                const status = data.status;
                const paymentId = data.payment_id;

                console.log(
                    `📊 Polling MP SIMPLE - Status: ${status}, Payment ID: ${paymentId}`
                );

                // ✅ PRIMERA VEZ: GUARDAR PAYMENT_ID INICIAL
                if (attempts === 1) {
                    paymentIdInicial = paymentId;
                    console.log(`📝 Payment ID inicial MP: ${paymentIdInicial}`);
                    return; // No verificar en el primer intento
                }

                // ✅ DETECCIÓN SIMPLE: approved + payment_id diferente al inicial
                if (status === 'approved' && paymentId && paymentId !== paymentIdInicial) {
                    console.log('✅ Pago MercadoPago EXITOSO detectado (método simple)');
                    clearInterval(pollInterval);

                    // ✅ MARCAR PAGO COMO COMPLETADO VISUALMENTE
                    if (window.markQRPaymentCompleted) {
                        window.markQRPaymentCompleted();
                    }

                    // ✅ IMPRIMIR TICKET DE ÉXITO AUTOMÁTICAMENTE (SIN CAMBIOS)
                    await imprimirTicketExito(
                        paymentData,
                        nis,
                        cliente,
                        metodoPago,
                        paymentId
                    );

                    // Esperar un momento para mostrar la confirmación visual
                    setTimeout(async () => {
                        if (onSuccess) {
                            await onSuccess();
                        }
                    }, 1500);
                    return;
                }

                if (status === 'rejected') {
                    console.log('❌ Pago MercadoPago rechazado (método simple)');
                    clearInterval(pollInterval);

                    Swal.close();
                    await showErrorAlert(
                        'Pago rechazado',
                        'El pago no pudo ser procesado. Intenta nuevamente.'
                    );

                    if (onCancel) onCancel();
                    return;
                }
            } else {
                console.error(
                    `❌ Error en polling MP SIMPLE: ${response.status} ${response.statusText}`
                );
            }

            // ✅ TIMEOUT
            if (attempts >= maxAttempts) {
                console.log('⏰ Timeout alcanzado para MercadoPago SIMPLE');
                clearInterval(pollInterval);

                Swal.close();
                await showInfoAlert(
                    'Tiempo agotado',
                    'El tiempo de espera ha expirado. Verifica el estado de tu pago.'
                );

                if (onCancel) onCancel();
            }
        } catch (error) {
            console.error('❌ Error en polling MercadoPago SIMPLE:', error);
        }
    }, 3000); // Cada 5 segundos

    // Cleanup si se cancela
    return () => clearInterval(pollInterval);
};

// ===== UTILIDADES DE FECHA =====
const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const parseDate = (dateString) => {
    const parts = dateString.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
};

// ===== ENVÍO DE PAGO A LA API =====
const submitPayment = async (paymentData, nis, metodoPago) => {
    const factura = paymentData.factura;
    const unitPrice = parseInt(paymentData.importe);
    const vencimientoFecha = paymentData.fecha;
    const isFirstVencimiento = paymentData.vencimiento === '1';

    const vto =
        formatDate(parseDate(paymentData.fecha)) +
        (isFirstVencimiento ? ' VTO_1' : ' VTO_2');

    console.log('🚀 DATOS PARA PAGO:', {
        factura,
        nis,
        fecha_original: paymentData.fecha,
        vencimiento_formateado: vto,
        isFirstVencimiento,
    });

    const url =
        metodoPago === 'mercadopago'
            ? `${baseUrl}/api/payment-qr`
            : `${baseUrl}/api/modo/payment`;

    const body =
        metodoPago === 'mercadopago'
            ? JSON.stringify({
                  items: [
                      {
                          title: factura.toString(),
                          quantity: 1,
                          unit_price: unitPrice,
                      },
                  ],
                  metadata: {
                      nis,
                      factura: factura.toString(),
                      vencimiento: vto,
                  },
              })
            : JSON.stringify({
                  title: factura.toString(),
                  amount: unitPrice,
                  nis,
                  vencimientoFecha,
              });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
    });

    if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
};

// ✅ FUNCIÓN DE POLLING MODO CORREGIDA
const startModoPolling = async (
    paymentData,
    nis,
    metodoPago,
    cliente,
    onSuccess,
    onCancel
) => {
    console.log(
        `🔄 Iniciando polling MODO para factura ${paymentData.factura}, NIS ${nis}, vencimiento ${paymentData.vencimiento}`
    );

    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (cada 5 segundos)
    let estadoInicial = null;
    let paymentIdInicial = null;

    const pollInterval = setInterval(async () => {
        attempts++;
        console.log(
            `🔄 Polling MODO intento ${attempts}/${maxAttempts} - Vencimiento ${paymentData.vencimiento}`
        );

        try {
            const response = await fetch(`${baseUrl}/api/facturas?nis=${nis}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
                cache: 'no-cache',
            });

            if (response.ok) {
                const facturas = await response.json();
                const facturaActual = facturas.find(
                    (f) => (f.NROFACT || f.numero) == paymentData.factura
                );

                if (!facturaActual) {
                    console.warn('⚠️ Factura no encontrada en polling MODO');
                    return;
                }

                const estado = facturaActual.ESTADO;
                const paymentId = facturaActual.payment_id;
                const tienePago = paymentId !== null && paymentId !== '';

                console.log(
                    `📊 Polling MODO - Estado: ${estado}, Payment ID: ${paymentId}, Vencimiento: ${paymentData.vencimiento}`
                );

                // ✅ PRIMERA VEZ: GUARDAR ESTADO INICIAL
                if (attempts === 1) {
                    estadoInicial = estado;
                    paymentIdInicial = paymentId;
                    console.log(
                        `📝 Estado inicial guardado - Estado: ${estadoInicial}, Payment ID: ${paymentIdInicial}`
                    );
                    return; // No verificar en el primer intento
                }

                // ✅ LÓGICA DIFERENTE SEGÚN VENCIMIENTO (IGUAL QUE MERCADOPAGO)
                let pagoExitoso = false;

                if (paymentData.vencimiento === '1') {
                    // ✅ PRIMER VENCIMIENTO: Cambio a PARCIAL o EN PROCESO
                    if (
                        (estado === 'PARCIAL' || estado === 'EN PROCESO') &&
                        tienePago &&
                        estado !== estadoInicial
                    ) {
                        console.log(
                            `✅ Primer vencimiento pagado MODO: ${estadoInicial} → ${estado}`
                        );
                        pagoExitoso = true;
                    }
                } else if (paymentData.vencimiento === '2') {
                    // ✅ SEGUNDO VENCIMIENTO: Debe cambiar de PARCIAL a EN PROCESO
                    if (
                        estadoInicial === 'PARCIAL' &&
                        estado === 'EN PROCESO' &&
                        tienePago
                    ) {
                        console.log(
                            `✅ Segundo vencimiento pagado MODO: PARCIAL → EN PROCESO`
                        );
                        pagoExitoso = true;
                    }
                    // O si el payment_id cambió (nuevo pago)
                    else if (
                        paymentId &&
                        paymentId !== paymentIdInicial &&
                        estado === 'EN PROCESO'
                    ) {
                        console.log(
                            `✅ Segundo vencimiento pagado MODO: Nuevo payment_id ${paymentIdInicial} → ${paymentId}`
                        );
                        pagoExitoso = true;
                    }
                }

                if (pagoExitoso) {
                    console.log('✅ Pago MODO exitoso detectado');
                    clearInterval(pollInterval);

                    // ✅ IMPRIMIR TICKET DE ÉXITO AUTOMÁTICAMENTE
                    await imprimirTicketExito(
                        paymentData,
                        nis,
                        cliente,
                        metodoPago,
                        paymentId
                    );

                    // Esperar un momento para mostrar la confirmación visual
                    setTimeout(async () => {
                        if (onSuccess) {
                            await onSuccess();
                        }
                    }, 1500);
                    return;
                }

                if (estado === 'RECHAZADA') {
                    console.log('❌ Pago MODO rechazado - SIN IMPRESIÓN');
                    clearInterval(pollInterval);

                    // 🔥 REMOVIDO: await imprimirTicketFallo(...)

                    Swal.close();
                    await showErrorAlert(
                        'Pago rechazado',
                        'El pago no pudo ser procesado. Intenta nuevamente.'
                    );

                    if (onCancel) onCancel();
                    return;
                }
            } else {
                console.error(
                    `❌ Error en polling MODO: ${response.status} ${response.statusText}`
                );
            }

            // ✅ TIMEOUT
            if (attempts >= maxAttempts) {
                console.log('⏰ Timeout alcanzado para MODO - SIN IMPRESIÓN');
                clearInterval(pollInterval);

                // 🔥 REMOVIDO: await imprimirTicketFallo(...)

                Swal.close();
                await showInfoAlert(
                    'Tiempo agotado',
                    'El tiempo de espera ha expirado. Verifica el estado de tu pago.'
                );

                if (onCancel) onCancel();
            }
        } catch (error) {
            console.error('❌ Error en polling MODO:', error);
        }
    }, 5000); // Cada 5 segundos (igual que MercadoPago)

    // Cleanup si se cancela
    return () => clearInterval(pollInterval);
};

// ===== FUNCIÓN PRINCIPAL CORREGIDA =====
export const processPayment = async (
    paymentData,
    nis,
    onPaymentSuccess = null,
    onPaymentCancel = null
) => {
    const paymentId = `${paymentData.factura}_${
        paymentData.vencimiento
    }_${Date.now()}`;
    let cliente = null;

    try {
        console.log('🚀 Iniciando proceso de pago:', {
            paymentId,
            factura: paymentData.factura,
            vencimiento: paymentData.vencimiento,
            nis,
        });

        // ===== PASO 1: OBTENER DATOS DEL CLIENTE =====
        cliente = await obtenerDatosCliente(nis);
        console.log('👤 Datos del cliente obtenidos:', cliente);

        // ===== PASO 2: VALIDACIÓN =====
        showLoadingAlert('Validando factura...', 'Verificando estado actual');

        const validationResult = await validatePaymentStatus(
            paymentData.factura,
            nis
        );

        if (!validationResult.canProceed) {
            await showInfoAlert(
                validationResult.title,
                validationResult.message
            );
            return { success: false, reason: 'validation_failed' };
        }

        // ===== PASO 3: MÉTODO DE PAGO =====
        Swal.close();
        const metodoPago = await showPaymentMethodSelector();

        if (!metodoPago) {
            if (onPaymentCancel) onPaymentCancel();
            return { success: false, reason: 'user_cancelled' };
        }

        // ===== PASO 4: PROCESAR PAGO =====
        showLoadingAlert(
            'Procesando pago...',
            `Conectando con ${
                metodoPago === 'mercadopago' ? 'MercadoPago' : 'MODO'
            }`
        );

        const response = await submitPayment(paymentData, nis, metodoPago);
        Swal.close();

        // ===== PASO 5: MOSTRAR QR Y POLLING =====
        if (metodoPago === 'mercadopago') {
            if (!response.qr_url) {
                throw new Error(
                    'El QR de MercadoPago no fue generado correctamente'
                );
            }

            console.log(
                '🔄 Mostrando QR MercadoPago:',
                paymentId
            );

            // ✅ MOSTRAR QR SIN IMPRESIÓN EN CANCELACIÓN
            showMercadoPagoQR(response, async () => {
                console.log('❌ Usuario canceló QR MercadoPago - SOLO LOG, SIN IMPRESIÓN');
                
                // 🔥 REMOVIDO: await imprimirTicketFallo(...)
                
                // Limpiar detección de escaneo
                if (window.qrCleanup) {
                    window.qrCleanup();
                }

                if (onPaymentCancel) onPaymentCancel();
            });

            // ✅ INICIAR POLLING CON IMPRESIÓN AUTOMÁTICA SOLO EN ÉXITO
            startMercadoPagoPolling(
                paymentData,
                nis,
                metodoPago,
                cliente,
                // onSuccess
                async () => {
                    console.log('✅ Pago MercadoPago confirmado:', paymentId);
                    await refreshFacturasState(nis);
                    if (onPaymentSuccess) onPaymentSuccess();
                    Swal.close();
                    await showSuccessAlert(
                        '¡Pago exitoso!',
                        'Tu pago ha sido procesado correctamente'
                    );
                    window.location.reload();
                },
                // onCancel
                () => {
                    if (onPaymentCancel) onPaymentCancel();
                }
            );
        } else if (metodoPago === 'modo') {
            if (!response.qr) {
                throw new Error('El QR de MODO no fue generado correctamente');
            }

            console.log(
                '🔄 Mostrando QR MODO:',
                paymentId
            );

            // ✅ MOSTRAR QR SIN IMPRESIÓN EN CANCELACIÓN
            showModoQR(response, async () => {
                console.log('❌ Usuario canceló QR MODO - SOLO LOG, SIN IMPRESIÓN');

                // 🔥 REMOVIDO: await imprimirTicketFallo(...)

                if (onPaymentCancel) onPaymentCancel();
            });

            // ✅ INICIAR POLLING MODO SOLO CON IMPRESIÓN EN ÉXITO
            startModoPolling(
                paymentData,
                nis,
                metodoPago,
                cliente,
                // onSuccess
                async () => {
                    console.log('✅ Pago MODO confirmado:', paymentId);
                    await refreshFacturasState(nis);
                    if (onPaymentSuccess) onPaymentSuccess();
                    Swal.close();
                    await showSuccessAlert(
                        '¡Pago exitoso!',
                        'Tu pago ha sido procesado correctamente'
                    );
                    window.location.reload();
                },
                // onCancel
                () => {
                    if (onPaymentCancel) onPaymentCancel();
                }
            );
        }

        return { success: true, metodoPago, paymentId };
    } catch (error) {
        console.error('❌ Error al procesar el pago:', error);

        // 🔥 REMOVIDO: impresión de ticket de error técnico

        Swal.close();
        await showErrorAlert(
            'Error en el pago',
            error.message || 'No se pudo procesar el pago. Intente nuevamente.'
        );
        if (onPaymentCancel) onPaymentCancel();
        return {
            success: false,
            reason: 'processing_error',
            error: error.message,
        };
    }
};

// ===== FUNCIÓN PARA REFRESCAR MANUALMENTE EL ESTADO =====
export const forceRefreshFacturas = async (nis) => {
    console.log('🔄 Refresh manual de facturas solicitado para NIS:', nis);
    return await refreshFacturasState(nis);
};

// ===== EXPORTS =====
export {
    showLoadingAlert,
    showInfoAlert,
    showErrorAlert,
    showSuccessAlert,
    showPaymentMethodSelector,
    showModoQR,
    showMercadoPagoQR,
    refreshFacturasState,
    imprimirTicketExito,
    imprimirTicketFallo, // Ahora deshabilitada
};