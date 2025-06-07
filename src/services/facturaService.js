import Swal from 'sweetalert2';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Función para obtener facturas
export const fetchFacturas = async (nis) => {
    const response = await fetch(`${baseUrl}/api/facturas?nis=${nis}`);

    if (!response.ok) {
        throw new Error('Error al consultar el servidor');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
        throw new Error('No se encontraron facturas');
    }

    return data;
};

// Función para validar el estado de pago antes de procesar
export const validatePaymentStatus = async (factura, nis) => {
    try {
        const response = await fetch(
            `${baseUrl}/api/payment-status?factura=${factura}&nis=${nis}`
        );

        const data = await response.json();

        if (data.error) {
            return {
                canProceed: false,
                title: 'Error de validación',
                message:
                    data.message ||
                    'No se pudo validar el estado de la factura.',
            };
        }

        const estado = data.estado;
        const tipoFactura = data.tipoFactura;
        const puedePagarSegundoVencimiento = data.cta2Disponible;

        // Validaciones de estado
        if (estado === 'EN PROCESO') {
            return {
                canProceed: false,
                title: 'Pago en proceso',
                message:
                    'Esta factura ya está en proceso de pago. No es necesario volver a pagar.',
            };
        }

        if (estado === 'PAGADA') {
            return {
                canProceed: false,
                title: 'Factura ya pagada',
                message:
                    'Esta factura ya fue pagada y no puede volver a pagarse.',
            };
        }

        // Validaciones específicas para vencimientos
        // Estas validaciones se pueden expandir según la lógica de negocio
        if (estado === 'PARCIAL') {
            return {
                canProceed: false,
                title: 'Primer vencimiento ya pagado',
                message: 'Debes pagar el segundo vencimiento.',
            };
        }

        // Todo OK, puede proceder
        return {
            canProceed: true,
            estado,
            tipoFactura,
            puedePagarSegundoVencimiento,
        };
    } catch (error) {
        console.error('Error al validar estado de pago:', error);
        return {
            canProceed: false,
            title: 'Error de conexión',
            message:
                'No se pudo verificar el estado de la factura. Intente nuevamente.',
        };
    }
};

// Función para descargar factura en PDF
export const downloadFactura = async (factura, nis) => {
    try {
        // Extraer socio y suministro del NIS
        const suministro = nis.slice(-6).replace(/^0+/, '');
        const socio = nis.slice(0, -6).replace(/^0+/, '');

        // Mostrar loading
        Swal.fire({
            title: 'Descargando factura...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading(),
        });

        // Llamar a la API para obtener el PDF
        const response = await fetch(
            `https://staging.be.cooperativapopular.com.ar/api/scrap-factura?socio=${socio}&suministro=${suministro}&nrofactura=${factura.NROFACT}`
        );

        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        // Crear blob y descargar
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `factura_${factura.NROFACT}.pdf`;

        // Agregar al DOM, hacer click y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Limpiar URL del blob
        window.URL.revokeObjectURL(link.href);

        // Mostrar éxito
        Swal.fire({
            icon: 'success',
            title: '¡Descarga exitosa!',
            text: 'Su factura se ha descargado correctamente',
            timer: 2000,
            showConfirmButton: false,
        });
    } catch (error) {
        console.error('Error al descargar la factura:', error);

        Swal.fire({
            icon: 'error',
            title: 'Error en la descarga',
            text:
                error.message ||
                'No se pudo descargar la factura. Intente nuevamente.',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#dc2626',
        });
    }
};

// Función para verificar si una fecha está vencida
export const isVencido = (fechaString) => {
    try {
        const [day, month, year] = fechaString.split('/');
        const fecha = new Date(year, month - 1, day);
        const hoy = new Date();

        // Comparar solo fechas (sin hora)
        fecha.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        return fecha < hoy;
    } catch (error) {
        console.error('Error al parsear fecha:', error);
        return false;
    }
};

// Función para formatear montos
export const formatMonto = (monto) => {
    const numero = parseFloat(monto || 0);
    return numero.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
};

// Función para calcular días de vencimiento
export const getDiasVencimiento = (fechaString) => {
    try {
        const [day, month, year] = fechaString.split('/');
        const fecha = new Date(year, month - 1, day);
        const hoy = new Date();

        fecha.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        const diffTime = fecha - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    } catch (error) {
        console.error('Error al calcular días de vencimiento:', error);
        return 0;
    }
};

// Función para obtener el estado visual de una factura
export const getFacturaStatus = (factura) => {
    const dias1 = getDiasVencimiento(factura.CTA1_VTO);
    const dias2 = factura.CTA2_VTO
        ? getDiasVencimiento(factura.CTA2_VTO)
        : null;

    if (dias1 < 0) {
        return {
            status: 'vencido',
            color: 'red',
            icon: '⚠️',
            message: `Vencido hace ${Math.abs(dias1)} días`,
        };
    } else if (dias1 <= 7) {
        return {
            status: 'por-vencer',
            color: 'orange',
            icon: '⏰',
            message: `Vence en ${dias1} días`,
        };
    } else {
        return {
            status: 'vigente',
            color: 'green',
            icon: '✅',
            message: `Vigente`,
        };
    }
};
