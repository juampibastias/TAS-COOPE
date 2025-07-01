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

// ===== FUNCIÓN PARA REFRESCAR ESTADO DE FACTURAS =====
const refreshFacturasState = async (nis) => {
    try {
        console.log('🔄 Refrescando estado de facturas para NIS:', nis);

        const response = await fetch(`${baseUrl}/api/facturas/${nis}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // Forzar request fresco sin cache
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

const showMercadoPagoQR = (data, onManualCheck = null, onCancel = null) => {
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
              📱 Escaneá y pagá desde tu app
            </p>
            <p style="margin-top:5px;font-size:14px;text-align:center; color: #666;">
              Una vez que pagues, esta ventana se cerrará automáticamente
            </p>
            <p style="margin-top:5px;font-size:12px;text-align:center; color: #999;">
              El QR expira en 30 minutos
            </p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Ya pagué - Verificar',
        confirmButtonColor: '#009ee3',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#dc2626',
        width: 500,
        allowOutsideClick: false,
        preConfirm: () => {
            if (onManualCheck) onManualCheck();
        },
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel && onCancel) {
            onCancel();
        }
    });
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

    // ✅ FORMATO EXACTO que usa /payment-url
    const vto =
        formatDate(parseDate(paymentData.fecha)) +
        (isFirstVencimiento ? ' VTO_1' : ' VTO_2');

    console.log('🚀 DATOS PARA /payment-qr:', {
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
                      // ✅ METADATA IDÉNTICA A /payment
                      nis,
                      factura: factura.toString(),
                      vencimiento: vto, // "01-07-2025 VTO_1"
                  },
              })
            : JSON.stringify({
                  title: factura.toString(),
                  amount: unitPrice,
                  nis,
                  vencimientoFecha,
              });

    console.log(
        '📤 Metadata enviada a /payment-qr:',
        JSON.parse(body).metadata
    );

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

// ===== FUNCIÓN PRINCIPAL PARA PROCESAR PAGOS =====
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

        // ===== PASO 1: VALIDACIÓN INICIAL CON LOGGING =====
        showLoadingAlert('Validando factura...', 'Verificando estado actual');

        // Logging detallado para diagnóstico
        console.log('🔍 DATOS ENVIADOS A VALIDACIÓN:', {
            factura: paymentData.factura,
            nis: nis,
            vencimiento: paymentData.vencimiento,
            fecha: paymentData.fecha,
            importe: paymentData.importe,
            timestamp: new Date().toISOString(),
        });

        const validationResult = await validatePaymentStatus(
            paymentData.factura,
            nis
        );

        console.log('📊 RESULTADO DE VALIDACIÓN:', {
            paymentId,
            canProceed: validationResult.canProceed,
            title: validationResult.title,
            message: validationResult.message,
            estadoActual: validationResult.estadoActual,
            timestamp: new Date().toISOString(),
        });

        if (!validationResult.canProceed) {
            console.log('❌ PAGO BLOQUEADO:', {
                paymentId,
                reason: validationResult.message,
            });
            await showInfoAlert(
                validationResult.title,
                validationResult.message
            );
            return { success: false, reason: 'validation_failed' };
        }

        // ===== PASO 2: SELECCIONAR MÉTODO DE PAGO =====
        Swal.close(); // Cerrar loading de validación
        const metodoPago = await showPaymentMethodSelector();

        if (!metodoPago) {
            console.log(
                '⚠️ Usuario canceló selección de método de pago:',
                paymentId
            );
            if (onPaymentCancel) onPaymentCancel();
            return { success: false, reason: 'user_cancelled' };
        }

        console.log('💳 Método de pago seleccionado:', {
            paymentId,
            metodoPago,
        });

        // ===== PASO 3: PROCESAR PAGO =====
        showLoadingAlert(
            'Procesando pago...',
            `Conectando con ${
                metodoPago === 'mercadopago' ? 'MercadoPago' : 'MODO'
            }`
        );

        const response = await submitPayment(paymentData, nis, metodoPago);
        console.log('✅ Respuesta de API de pago:', { paymentId, response });

        Swal.close(); // Cerrar loading de procesamiento

        // ===== PASO 4: MANEJAR RESPUESTA SEGÚN MÉTODO =====
        if (metodoPago === 'mercadopago') {
            if (!response.qr_url) {
                throw new Error(
                    'El QR de MercadoPago no fue generado correctamente'
                );
            }

            console.log(
                '🔄 Mostrando QR de MercadoPago y configurando auto-refresh:',
                paymentId
            );

            // Configurar auto-refresh para MercadoPago (webhook puede tardar)
            const refreshInterval = setInterval(async () => {
                console.log(
                    '🔄 Auto-refresh de facturas (MercadoPago):',
                    paymentId
                );
                await refreshFacturasState(nis);
            }, 10000); // Cada 10 segundos

            // Detener auto-refresh después de 5 minutos
            setTimeout(() => {
                clearInterval(refreshInterval);
                console.log('⏹️ Auto-refresh detenido para:', paymentId);
            }, 300000);

            showMercadoPagoQR(
                response,
                // onManualCheck
                async () => {
                    console.log(
                        '🔍 Verificación manual solicitada:',
                        paymentId
                    );
                    clearInterval(refreshInterval);
                    await refreshFacturasState(nis);
                    if (onPaymentSuccess) onPaymentSuccess();
                    Swal.close();
                },
                // onCancel
                () => {
                    console.log(
                        '❌ Usuario canceló QR MercadoPago:',
                        paymentId
                    );
                    clearInterval(refreshInterval);
                    if (onPaymentCancel) onPaymentCancel();
                }
            );
        } else if (metodoPago === 'modo') {
            if (!response.qr) {
                throw new Error('El QR de MODO no fue generado correctamente');
            }

            console.log(
                '🔄 Mostrando QR de MODO e iniciando polling:',
                paymentId
            );

            showModoQR(
                response,
                // onCancel
                () => {
                    console.log('❌ Usuario canceló QR MODO:', paymentId);
                    if (onPaymentCancel) onPaymentCancel();
                }
            );

            // Iniciar polling para MODO con callback de éxito
            const isSecondVencimiento = paymentData.vencimiento !== '1';
            startPolling(
                paymentData.factura,
                nis,
                // onSuccess callback
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
        console.error('❌ Error al procesar el pago:', {
            paymentId,
            error: error.message,
            stack: error.stack,
        });

        Swal.close(); // Asegurar que se cierre cualquier modal

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
