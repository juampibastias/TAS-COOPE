import Swal from 'sweetalert2';
import { validatePaymentStatus } from './facturaService';
import { startPolling } from './modoPollingService';

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

// ===== FUNCIÓN PARA REFRESCAR ESTADO DE FACTURAS (CORREGIDA) =====
const refreshFacturasState = async (nis) => {
    try {
        console.log('🔄 Refrescando estado de facturas para NIS:', nis);

        // ✅ USAR ENDPOINT CORRECTO QUE SÍ EXISTE
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

// ✅ QR MERCADOPAGO SIMPLE - IGUAL QUE MODO
const showMercadoPagoQR = (data, onCancel = null) => {
    Swal.fire({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <h3 style="margin-bottom: 20px; color: #009ee3; font-size: 24px;">Escaneá con tu app MercadoPago</h3>
            <img 
              src="${data.qr_url}" 
              alt="QR MercadoPago" 
              style="display: block; margin: 0 auto; border: 4px solid #009ee3; border-radius: 15px; box-shadow: 0 8px 25px rgba(0, 158, 227, 0.3);" 
            />
            <p style="margin-top:10px;font-size:16px;text-align:center; color: #009ee3; font-weight: bold;">
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

// ✅ FUNCIÓN DE POLLING CON DETECCIÓN DE CAMBIOS PARA SEGUNDO VENCIMIENTO
const startMercadoPagoPolling = async (
    factura,
    nis,
    vencimiento,
    onSuccess,
    onCancel
) => {
    console.log(
        `🔄 Iniciando polling MercadoPago para factura ${factura}, NIS ${nis}, vencimiento ${vencimiento}`
    );

    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (cada 5 segundos)
    let estadoInicial = null;
    let paymentIdInicial = null;

    const pollInterval = setInterval(async () => {
        attempts++;
        console.log(
            `🔄 Polling MP intento ${attempts}/${maxAttempts} - Vencimiento ${vencimiento}`
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
                    (f) => (f.NROFACT || f.numero) == factura
                );

                if (!facturaActual) {
                    console.warn('⚠️ Factura no encontrada en polling MP');
                    return;
                }

                const estado = facturaActual.ESTADO;
                const paymentId = facturaActual.payment_id;
                const tienePago = paymentId !== null && paymentId !== '';

                console.log(
                    `📊 Polling MP - Estado: ${estado}, Payment ID: ${paymentId}, Vencimiento: ${vencimiento}`
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

                // ✅ LÓGICA DIFERENTE SEGÚN VENCIMIENTO
                let pagoExitoso = false;

                if (vencimiento === '1') {
                    // ✅ PRIMER VENCIMIENTO: Cambio a PARCIAL o EN PROCESO
                    if (
                        (estado === 'PARCIAL' || estado === 'EN PROCESO') &&
                        tienePago &&
                        estado !== estadoInicial
                    ) {
                        console.log(
                            `✅ Primer vencimiento pagado: ${estadoInicial} → ${estado}`
                        );
                        pagoExitoso = true;
                    }
                } else if (vencimiento === '2') {
                    // ✅ SEGUNDO VENCIMIENTO: Debe cambiar de PARCIAL a EN PROCESO
                    if (
                        estadoInicial === 'PARCIAL' &&
                        estado === 'EN PROCESO' &&
                        tienePago
                    ) {
                        console.log(
                            `✅ Segundo vencimiento pagado: PARCIAL → EN PROCESO`
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
                            `✅ Segundo vencimiento pagado: Nuevo payment_id ${paymentIdInicial} → ${paymentId}`
                        );
                        pagoExitoso = true;
                    }
                }

                if (pagoExitoso) {
                    console.log('✅ Pago MercadoPago exitoso detectado');
                    clearInterval(pollInterval);

                    if (onSuccess) {
                        await onSuccess();
                    }
                    return;
                }

                if (estado === 'RECHAZADA') {
                    console.log('❌ Pago MercadoPago rechazado');
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
                    `❌ Error en polling MP: ${response.status} ${response.statusText}`
                );
            }

            // ✅ TIMEOUT
            if (attempts >= maxAttempts) {
                console.log('⏰ Timeout alcanzado para MercadoPago');
                clearInterval(pollInterval);

                Swal.close();
                await showInfoAlert(
                    'Tiempo agotado',
                    'El tiempo de espera ha expirado. Verifica el estado de tu pago.'
                );

                if (onCancel) onCancel();
            }
        } catch (error) {
            console.error('❌ Error en polling MercadoPago:', error);
        }
    }, 5000);

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

// ===== FUNCIÓN PRINCIPAL SIMPLIFICADA =====
export const processPayment = async (
    paymentData,
    nis,
    onPaymentSuccess = null,
    onPaymentCancel = null
) => {
    const paymentId = `${paymentData.factura}_${
        paymentData.vencimiento
    }_${Date.now()}`;

    try {
        console.log('🚀 Iniciando proceso de pago:', {
            paymentId,
            factura: paymentData.factura,
            vencimiento: paymentData.vencimiento,
            nis,
        });

        // ===== PASO 1: VALIDACIÓN =====
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

        // ===== PASO 2: MÉTODO DE PAGO =====
        Swal.close();
        const metodoPago = await showPaymentMethodSelector();

        if (!metodoPago) {
            if (onPaymentCancel) onPaymentCancel();
            return { success: false, reason: 'user_cancelled' };
        }

        // ===== PASO 3: PROCESAR PAGO =====
        showLoadingAlert(
            'Procesando pago...',
            `Conectando con ${
                metodoPago === 'mercadopago' ? 'MercadoPago' : 'MODO'
            }`
        );

        const response = await submitPayment(paymentData, nis, metodoPago);
        Swal.close();

        // ===== PASO 4: MOSTRAR QR Y POLLING =====
        if (metodoPago === 'mercadopago') {
            if (!response.qr_url) {
                throw new Error(
                    'El QR de MercadoPago no fue generado correctamente'
                );
            }

            console.log(
                '🔄 Mostrando QR MercadoPago e iniciando polling:',
                paymentId
            );

            // ✅ MOSTRAR QR SIMPLE
            showMercadoPagoQR(response, () => {
                console.log('❌ Usuario canceló QR MercadoPago:', paymentId);
                if (onPaymentCancel) onPaymentCancel();
            });

            // ✅ INICIAR POLLING CON DETECCIÓN ESPECÍFICA POR VENCIMIENTO
            startMercadoPagoPolling(
                paymentData.factura,
                nis,
                paymentData.vencimiento, // ✅ PASAR VENCIMIENTO
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
            // ===== MODO (sin cambios) =====
            if (!response.qr) {
                throw new Error('El QR de MODO no fue generado correctamente');
            }

            console.log(
                '🔄 Mostrando QR de MODO e iniciando polling:',
                paymentId
            );

            showModoQR(response, () => {
                console.log('❌ Usuario canceló QR MODO:', paymentId);
                if (onPaymentCancel) onPaymentCancel();
            });

            const isSecondVencimiento = paymentData.vencimiento !== '1';
            startPolling(
                paymentData.factura,
                nis,
                async () => {
                    console.log('✅ Pago MODO confirmado:', paymentId);
                    await refreshFacturasState(nis);
                    if (onPaymentSuccess) onPaymentSuccess();
                    Swal.close();
                    await showSuccessAlert(
                        '¡Pago exitoso!',
                        'Tu pago ha sido procesado correctamente'
                    );
                },
                isSecondVencimiento
            );
        }

        return { success: true, metodoPago, paymentId };
    } catch (error) {
        console.error('❌ Error al procesar el pago:', error);
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
};
