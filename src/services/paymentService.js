import Swal from 'sweetalert2';
import { validatePaymentStatus } from './facturaService';
import { startPolling } from './modoPollingService';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Funciones auxiliares para mostrar diferentes tipos de alertas
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

// Función para generar QR EMV interoperable
const generateInteroperableQR = async (paymentData, nis) => {
    const factura = paymentData.factura;
    const amount = parseInt(paymentData.importe);
    const vencimientoFecha = paymentData.fecha;

    const emvPayload = {
        merchant_account_information: {
            '02': process.env.NEXT_PUBLIC_MERCHANT_ID || 'COOPE_POPULAR',
            '03': factura.toString(),
        },
        merchant_category_code: '4814',
        transaction_currency: '032',
        transaction_amount: amount.toString(),
        country_code: 'AR',
        merchant_name: 'COOPERATIVA POPULAR',
        merchant_city: 'RIVADAVIA',
        50: process.env.NEXT_PUBLIC_MERCHANT_CUIT || '30123456789',
        additional_data_field_template: {
            bill_number: factura.toString(),
            customer_id: nis,
            due_date: vencimientoFecha,
        },
    };

    const response = await fetch(`${baseUrl}/api/emv-qr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emvPayload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
            `Error ${response.status}: ${
                errorData.message || response.statusText
            }`
        );
    }

    return await response.json();
};

// Función para mostrar el selector de método de pago
const showPaymentMethodSelector = async () => {
    const metodoModoHabilitado =
        process.env.NEXT_PUBLIC_MODO_ENABLED === 'true';
    const metodoMPHabilitado =
        process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true';
    const qrEMVHabilitado = process.env.NEXT_PUBLIC_EMV_QR_ENABLED === 'true';

    const { value: metodoPago } = await Swal.fire({
        title: 'Selecciona un método de pago',
        html: `
          <div style="text-align: left; font-size: 18px;">
            ${
                qrEMVHabilitado
                    ? `
            <label style="color: #059669; font-weight: bold; display: block; margin-bottom: 15px; padding: 15px; border: 3px solid #059669; border-radius: 8px; cursor: pointer; background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(120, 188, 27, 0.1));">
              <input type="radio" name="metodoPago" value="emv_interoperable" style="margin-right: 10px; transform: scale(1.3);">
              🔗 QR INTEROPERABLE
              <br><small style="color: #666; margin-left: 25px;">✅ Compatible con MODO, MercadoPago y bancos</small>
            </label>`
                    : ''
            }
            
            <label style="${
                metodoMPHabilitado
                    ? 'color: #0066cc; font-weight: bold;'
                    : 'color: grey;'
            }; display: block; margin-bottom: 15px; padding: 15px; border: 2px solid ${
            metodoMPHabilitado ? '#0066cc' : '#ccc'
        }; border-radius: 8px; cursor: ${
            metodoMPHabilitado ? 'pointer' : 'not-allowed'
        };">
              <input type="radio" name="metodoPago" value="mercadopago" ${
                  metodoMPHabilitado ? '' : 'disabled'
              } style="margin-right: 10px; transform: scale(1.3);">
              💳 Solo MercadoPago
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
              📱 Solo MODO ${metodoModoHabilitado ? '' : '(Próximamente)'}
            </label>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#dc2626',
        width: 600,
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

// Función para mostrar el QR de MODO
const showModoQR = (data) => {
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
    });
};

// Función para mostrar QR EMV Interoperable
const showEMVQR = (data) => {
    Swal.fire({
        html: `
          <div style="text-align: center;">
            <h3 style="color: #059669; margin-bottom: 20px; font-size: 22px;">
              🔗 QR INTEROPERABLE EMV
            </h3>
            <p style="margin-bottom: 20px; font-size: 16px; color: #333;">
              Escaneá con <strong>cualquier billetera digital</strong>
            </p>
            <img 
              src="${data.qr_url}" 
              alt="QR Interoperable EMV" 
              style="border: 4px solid #059669; border-radius: 15px; box-shadow: 0 8px 25px rgba(5, 150, 105, 0.3); margin-bottom: 20px;" 
            />
            <div style="display: flex; justify-content: space-around; margin-bottom: 15px; font-size: 16px;">
              <span>📱 MODO</span>
              <span>💳 MercadoPago</span>
              <span>🏦 Bancos</span>
              <span>🔗 Otras</span>
            </div>
            <div style="background: #f0f9ff; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
              <p style="font-size: 12px; color: #666; margin: 0;">
                <strong>Estándar EMV QR Code</strong><br>
                Compatible con normativa BCRA Argentina
              </p>
            </div>
            <p style="margin-top: 15px; color: #059669; font-weight: bold; font-size: 16px;">
              ⏱️ Esperando confirmación de pago...
            </p>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#dc2626',
        width: 550,
        allowOutsideClick: false,
    });
};

// Función para formatear fecha
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

// Función para enviar el pago a la API
const submitPayment = async (paymentData, nis, metodoPago) => {
    const factura = paymentData.factura;
    const unitPrice = parseInt(paymentData.importe);
    const vencimientoFecha = paymentData.fecha;
    const isFirstVencimiento = paymentData.vencimiento === '1';
    const vto =
        formatDate(parseDate(paymentData.fecha)) +
        (isFirstVencimiento ? ' VTO_1' : ' VTO_2');

    const url =
        metodoPago === 'mercadopago'
            ? `${baseUrl}/api/payment`
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
                      origen: 'checkout_pro',
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

// Función de polling universal para QR EMV (simplificada para testing)
const startUniversalPolling = (factura, nis) => {
    console.log(
        `🔄 Iniciando polling universal para factura: ${factura}, NIS: ${nis}`
    );

    // Polling simplificado para testing
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(
                `${baseUrl}/api/payment-status/${factura}/${nis}`
            );

            if (response.ok) {
                const data = await response.json();

                if (data.status === 'approved') {
                    clearInterval(pollInterval);
                    Swal.close();
                    await showSuccessAlert(
                        '¡Pago confirmado!',
                        `Pagado exitosamente con ${
                            data.wallet_source || 'billetera digital'
                        }`
                    );
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Error en polling universal:', error);
        }
    }, 3000);

    // Timeout después de 5 minutos
    setTimeout(() => {
        clearInterval(pollInterval);
        Swal.close();
        showErrorAlert(
            'Tiempo agotado',
            'El QR ha expirado. Intente nuevamente.'
        );
    }, 300000);
};

// Función principal para procesar pagos
export const processPayment = async (paymentData, nis) => {
    try {
        // Paso 1: Validación inicial
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
            return;
        }

        // Paso 2: Seleccionar método de pago
        const metodoPago = await showPaymentMethodSelector();
        if (!metodoPago) return;

        // Paso 3: Procesar según el método seleccionado
        if (metodoPago === 'emv_interoperable') {
            // QR EMV Interoperable
            showLoadingAlert(
                'Generando QR interoperable...',
                'Compatible con todas las billeteras digitales'
            );

            const response = await generateInteroperableQR(paymentData, nis);

            if (!response.qr_code) {
                throw new Error('Error generando QR interoperable');
            }

            // Mostrar QR EMV
            showEMVQR(response);

            // Iniciar polling universal
            startUniversalPolling(paymentData.factura, nis);
        } else {
            // Métodos tradicionales (MODO o MercadoPago)
            showLoadingAlert(
                'Procesando pago...',
                `Conectando con ${
                    metodoPago === 'mercadopago' ? 'MercadoPago' : 'MODO'
                }`
            );

            const response = await submitPayment(paymentData, nis, metodoPago);

            // Manejar respuesta según el método
            if (metodoPago === 'mercadopago') {
                // Redirigir a MercadoPago
                if (response.init_point) {
                    window.location.href = response.init_point;
                } else {
                    throw new Error(
                        'No se recibió el enlace de pago de MercadoPago'
                    );
                }
            } else if (metodoPago === 'modo') {
                // Mostrar QR MODO y empezar polling
                if (!response.qr) {
                    throw new Error('El QR no fue generado correctamente.');
                }

                showModoQR(response);

                // Iniciar polling para MODO
                const isSecondVencimiento = paymentData.vencimiento !== '1';
                startPolling(
                    paymentData.factura,
                    nis,
                    null,
                    isSecondVencimiento
                );
            }
        }
    } catch (error) {
        console.error('❌ Error al procesar el pago:', error);
        await showErrorAlert(
            'Error en el pago',
            error.message || 'No se pudo procesar el pago. Intente nuevamente.'
        );
    }
};

// Funciones auxiliares exportadas para uso en otros componentes
export {
    showLoadingAlert,
    showInfoAlert,
    showErrorAlert,
    showSuccessAlert,
    showPaymentMethodSelector,
    showModoQR,
    generateInteroperableQR,
};
