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

// Función para mostrar el selector de método de pago
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
                    ? 'color: #059669; font-weight: bold;'
                    : 'color: grey;'
            }; display: block; margin-bottom: 15px; padding: 15px; border: 2px solid ${
            metodoMPHabilitado ? '#059669' : '#ccc'
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

        // Paso 3: Procesar pago
        showLoadingAlert(
            'Procesando pago...',
            `Conectando con ${
                metodoPago === 'mercadopago' ? 'MercadoPago' : 'MODO'
            }`
        );

        const response = await submitPayment(paymentData, nis, metodoPago);

        // Paso 4: Manejar respuesta según el método
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
            // Mostrar QR y empezar polling
            if (!response.qr) {
                throw new Error('El QR no fue generado correctamente.');
            }

            showModoQR(response);

            // Iniciar polling para MODO
            const isSecondVencimiento = paymentData.vencimiento !== '1';
            startPolling(paymentData.factura, nis, null, isSecondVencimiento);
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
};
