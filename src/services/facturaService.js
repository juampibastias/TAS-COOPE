import Swal from 'sweetalert2';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// ===== FUNCIÓN PARA OBTENER FACTURAS =====
export const fetchFacturas = async (nis) => {
    console.log('📡 Consultando facturas para NIS:', nis);

    const response = await fetch(`${baseUrl}/api/facturas?nis=${nis}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache', // Siempre obtener datos frescos
    });

    if (!response.ok) {
        console.error(
            '❌ Error en respuesta del servidor:',
            response.status,
            response.statusText
        );
        throw new Error(`Error al consultar el servidor: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
        console.warn('⚠️ No se encontraron facturas para NIS:', nis);
        throw new Error('No se encontraron facturas');
    }

    console.log('✅ Facturas obtenidas:', data.length, 'facturas');
    return data;
};

// ===== FUNCIÓN MEJORADA PARA VALIDAR ESTADO DE PAGO =====
export const validatePaymentStatus = async (
    factura,
    nis,
    vencimiento = null
) => {
    try {
        console.log('🔍 Validando estado de pago:', {
            factura,
            nis,
            vencimiento,
        });

        const response = await fetch(
            `${baseUrl}/api/payment-status?factura=${factura}&nis=${nis}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-cache', // Datos frescos SIEMPRE
            }
        );

        if (!response.ok) {
            console.error(
                '❌ Error en validación:',
                response.status,
                response.statusText
            );
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('📊 Respuesta de validación:', data);

        if (data.error) {
            return {
                canProceed: false,
                title: 'Error de validación',
                message:
                    data.message ||
                    'No se pudo validar el estado de la factura.',
                estadoActual: null,
            };
        }

        const estado = data.estado?.toUpperCase();
        const tipoFactura = data.tipoFactura;
        const puedePagarSegundoVencimiento = data.cta2Disponible;

        console.log('📋 Estado actual de la factura:', {
            factura,
            estado,
            tipoFactura,
            puedePagarSegundoVencimiento,
        });

        // ===== VALIDACIONES POR ESTADO =====

        // 1. Factura en proceso de pago
        if (estado === 'EN PROCESO') {
            return {
                canProceed: false,
                title: 'Pago en proceso',
                message:
                    'Esta factura ya está en proceso de pago. Aguarde la confirmación o refresque para verificar el estado.',
                estadoActual: estado,
            };
        }

        // 2. Factura completamente pagada
        if (estado === 'PAGADA') {
            return {
                canProceed: false,
                title: 'Factura ya pagada',
                message:
                    'Esta factura ya fue pagada completamente y no puede volver a pagarse.',
                estadoActual: estado,
            };
        }

        // 3. Factura parcialmente pagada (primer vencimiento pagado)
        if (estado === 'PARCIAL') {
            // Si intentan pagar el primer vencimiento de una factura parcial
            if (vencimiento === '1') {
                return {
                    canProceed: false,
                    title: 'Primer vencimiento ya pagado',
                    message:
                        'El primer vencimiento ya fue pagado. Puede proceder con el segundo vencimiento si está disponible.',
                    estadoActual: estado,
                };
            }

            // Si intentan pagar el segundo vencimiento o no especifican
            if (puedePagarSegundoVencimiento !== false) {
                return {
                    canProceed: true,
                    title: 'Puede pagar segundo vencimiento',
                    message:
                        'Primer vencimiento pagado. Proceda con el segundo vencimiento.',
                    estadoActual: estado,
                    tipoFactura,
                    puedePagarSegundoVencimiento,
                };
            } else {
                return {
                    canProceed: false,
                    title: 'Segundo vencimiento no disponible',
                    message:
                        'El segundo vencimiento no está disponible para esta factura.',
                    estadoActual: estado,
                };
            }
        }

        // 4. Factura impaga (puede pagar primer vencimiento)
        if (estado === 'IMPAGA') {
            // Si intentan pagar el segundo vencimiento sin haber pagado el primero
            if (vencimiento === '2') {
                return {
                    canProceed: false,
                    title: 'Debe pagar el primer vencimiento',
                    message:
                        'Debe pagar el primer vencimiento antes de poder pagar el segundo.',
                    estadoActual: estado,
                };
            }

            // Puede pagar el primer vencimiento
            return {
                canProceed: true,
                title: 'Puede proceder con el pago',
                message: 'La factura está disponible para pago.',
                estadoActual: estado,
                tipoFactura,
                puedePagarSegundoVencimiento,
            };
        }

        // 5. Estado desconocido o no manejado
        console.warn('⚠️ Estado de factura no reconocido:', estado);
        return {
            canProceed: true, // Permitir pero con advertencia
            title: 'Estado no reconocido',
            message: `Estado de factura: ${estado}. Proceda con precaución.`,
            estadoActual: estado,
            tipoFactura,
            puedePagarSegundoVencimiento,
        };
    } catch (error) {
        console.error('❌ Error al validar estado de pago:', error);
        return {
            canProceed: false,
            title: 'Error de conexión',
            message:
                'No se pudo verificar el estado de la factura. Verifique su conexión e intente nuevamente.',
            estadoActual: null,
        };
    }
};

// ===== FUNCIÓN ESPECÍFICA PARA VALIDAR VENCIMIENTO =====
export const validateVencimientoPayment = async (factura, nis, vencimiento) => {
    console.log('🎯 Validando vencimiento específico:', {
        factura,
        nis,
        vencimiento,
    });

    const result = await validatePaymentStatus(factura, nis, vencimiento);

    // Log adicional para debugging de vencimientos
    console.log('🎯 Resultado validación de vencimiento:', {
        factura,
        vencimiento,
        canProceed: result.canProceed,
        estado: result.estadoActual,
        message: result.message,
    });

    return result;
};

// ===== FUNCIÓN PARA OBTENER FACTURAS CON ESTADO ACTUALIZADO =====
export const fetchFacturasWithStatus = async (nis) => {
    try {
        const facturas = await fetchFacturas(nis);

        // Enriquecer cada factura con información de estado actualizada
        const facturasEnriquecidas = await Promise.all(
            facturas.map(async (factura) => {
                try {
                    const statusInfo = await validatePaymentStatus(
                        factura.numero || factura.NROFACT,
                        nis
                    );
                    return {
                        ...factura,
                        estadoValidado: statusInfo.estadoActual,
                        puedeProceeder: statusInfo.canProceed,
                        mensajeEstado: statusInfo.message,
                    };
                } catch (error) {
                    console.warn(
                        `⚠️ No se pudo validar estado de factura ${factura.numero}:`,
                        error
                    );
                    return factura; // Retornar factura original si falla la validación
                }
            })
        );

        return facturasEnriquecidas;
    } catch (error) {
        console.error('❌ Error al obtener facturas con estado:', error);
        throw error;
    }
};

// ===== FUNCIÓN PARA DESCARGAR FACTURA EN PDF (MANTENIDA) =====
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

// ===== FUNCIONES UTILITARIAS (MANTENIDAS) =====

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
