import Swal from 'sweetalert2';
import { processPayment } from '../services/paymentService';
import { downloadFactura, isVencido } from '../services/facturaService';

// Cache para validaciones (30 segundos de vida)
const cacheValidaciones = new Map();
let validandoPago = false;

// Función para limpiar cache expirado
function limpiarCacheExpirado() {
    const ahora = Date.now();
    for (const [key, value] of cacheValidaciones.entries()) {
        if (ahora - value.timestamp > 30000) { // 30 segundos
            cacheValidaciones.delete(key);
        }
    }
}

// Función para calcular los importes correctos según la lógica original
function calcularImportesFactura(factura) {
    const estado = factura.ESTADO;
    const cta1Imp = parseFloat(factura.CTA1_IMP || 0);
    const cta2Imp = parseFloat(factura.CTA2_IMP || 0);

    let importe1Mostrar = 0;
    let importe2Mostrar = 0;
    let habilitarPago1 = false;
    let habilitarPago2 = false;
    let estadoPago1 = 'PENDIENTE';
    let estadoPago2 = 'PENDIENTE';

    if (estado === 'IMPAGA') {
        // Ambos vencimientos pendientes
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = true;
        // ✅ LÓGICA REPLICADA: Solo habilitar segundo vencimiento si hay importe > 0
        // Pero NO permitir pagar segundo si primer vencimiento está pendiente
        habilitarPago2 = false; // Se habilita en el modal con validación
        estadoPago1 = 'PENDIENTE';
        estadoPago2 = cta2Imp > 0 ? 'PENDIENTE' : 'NO_DISPONIBLE';
    } else if (estado === 'PARCIAL') {
        // Primer vencimiento pagado, solo segundo pendiente
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = false;
        habilitarPago2 = true;
        estadoPago1 = 'PAGADO';
        estadoPago2 = 'PENDIENTE';
    } else if (estado === 'PAGADA') {
        // Ambos pagados (no debería aparecer en la lista)
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = false;
        habilitarPago2 = false;
        estadoPago1 = 'PAGADO';
        estadoPago2 = 'PAGADO';
    }

    return {
        importe1: importe1Mostrar,
        importe2: importe2Mostrar,
        habilitarPago1,
        habilitarPago2,
        estadoPago1,
        estadoPago2,
        tieneSegundoVencimiento: cta2Imp > 0 && factura.CTA2_VTO,
    };
}

// ✅ FUNCIÓN MEJORADA PARA VALIDAR ESTADO CON TIMEOUT Y RETRY
async function validarEstadoFactura(factura, vencimiento, nis, reintentos = 2) {
    // Limpiar cache expirado
    limpiarCacheExpirado();
    
    // Verificar cache
    const cacheKey = `${factura.NROFACT}-${nis}-${Date.now().toString().slice(0, -4)}`; // Cache por 10 segundos
    const cached = cacheValidaciones.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 10000) { // 10 segundos de cache
        console.log('🔄 Usando validación desde cache');
        return cached.data;
    }

    for (let intento = 0; intento < reintentos; intento++) {
        try {
            console.log(`🔍 Validando estado (intento ${intento + 1}/${reintentos})`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

            const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const estadoResponse = await fetch(
                `${baseUrl}/api/payment-status?factura=${factura.NROFACT}&nis=${nis}`,
                { 
                    signal: controller.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }
            );
            
            clearTimeout(timeoutId);

            if (!estadoResponse.ok) {
                throw new Error(`HTTP ${estadoResponse.status}: ${estadoResponse.statusText}`);
            }

            const estadoData = await estadoResponse.json();

            if (estadoData.error) {
                throw new Error(estadoData.message || 'No se pudo validar el estado de la factura.');
            }

            const estado = estadoData.estado;
            const tipoFactura = estadoData.tipoFactura;

            // Guardar en cache
            const resultado = { estado, tipoFactura };
            cacheValidaciones.set(cacheKey, { 
                data: resultado, 
                timestamp: Date.now() 
            });

            // ✅ VALIDACIONES REPLICADAS EXACTAMENTE
            if (estado === 'EN PROCESO') {
                Swal.fire({
                    icon: 'info',
                    title: 'Pago en proceso',
                    text: 'Esta factura ya está en proceso de pago. No es necesario volver a pagar.',
                });
                return false;
            }

            if (estado === 'PAGADA') {
                Swal.fire({
                    icon: 'success',
                    title: 'Factura ya pagada',
                    text: 'Esta factura ya fue pagada y no puede volver a pagarse.',
                });
                return false;
            }

            if (estado === 'PARCIAL' && vencimiento === 1) {
                Swal.fire({
                    icon: 'info',
                    title: 'Primer vencimiento ya pagado',
                    text: 'Debes pagar el segundo vencimiento.',
                });
                return false;
            }

            // ✅ VALIDACIÓN CLAVE: No permitir pagar segundo vencimiento si primero está impago
            if (estado === 'IMPAGA' && vencimiento === 2 && tipoFactura === 'doble-vencimiento') {
                Swal.fire({
                    icon: 'info',
                    title: 'Debes pagar el primer vencimiento',
                    text: 'Para abonar el segundo vencimiento, primero debes pagar el primero.',
                });
                return false;
            }

            return true;

        } catch (error) {
            console.error(`❌ Error en validación (intento ${intento + 1}):`, error);
            
            // Si es el último intento, mostrar error
            if (intento === reintentos - 1) {
                if (error.name === 'AbortError') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Tiempo de espera agotado',
                        text: 'La validación está tardando más de lo esperado. Por favor, inténtalo nuevamente.',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error de conexión',
                        text: 'No se pudo validar el estado de la factura. Verificá tu conexión e inténtalo nuevamente.',
                    });
                }
                return false;
            }
            
            // Esperar antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000 * (intento + 1))); // 1s, 2s, etc.
        }
    }
    
    return false;
}

// ✅ FUNCIÓN MEJORADA PARA PROCESAR EL PAGO CON PROTECCIÓN CONTRA RACE CONDITIONS
async function procesarPago(factura, vencimiento, nis) {
    // Verificar si ya hay un pago en proceso
    if (validandoPago) {
        Swal.fire({
            icon: 'info',
            title: 'Procesando pago anterior',
            text: 'Ya hay un pago en proceso. Por favor, espera a que termine.',
            timer: 3000,
            timerProgressBar: true
        });
        return false;
    }

    validandoPago = true;
    
    try {
        console.log(`💳 Iniciando proceso de pago - Factura: ${factura.NROFACT}, Vencimiento: ${vencimiento}`);
        
        // Validar estado en tiempo real justo antes del pago
        const esValido = await validarEstadoFactura(factura, vencimiento, nis);
        if (!esValido) {
            return false;
        }

        const calculado = calcularImportesFactura(factura);
        
        // Determinar importe y fecha según vencimiento
        let unitPrice = 0;
        let vencimientoFecha = null;
        let vto = null;

        if (vencimiento === 1) {
            unitPrice = parseInt(factura.CTA1_IMP || 0);
            vencimientoFecha = factura.CTA1_VTO;
            vto = formatDate(parseDate(factura.CTA1_VTO)) + ' VTO_1';
        } else {
            unitPrice = parseInt(factura.CTA2_IMP || 0);
            vencimientoFecha = factura.CTA2_VTO;
            vto = formatDate(parseDate(factura.CTA2_VTO)) + ' VTO_2';
        }

        // Procesar con processPayment existente
        const paymentData = {
            factura: factura.NROFACT,
            vencimiento: vencimiento.toString(),
            fecha: vencimientoFecha,
            importe: unitPrice.toString(),
        };

        console.log('📤 Enviando datos de pago:', paymentData);
        
        // Llamar a la función original de procesamiento
        await processPayment(paymentData, nis);
        
        return true;

    } catch (error) {
        console.error('❌ Error al procesar pago:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error en el procesamiento',
            text: error.message || 'Hubo un problema al procesar el pago. Inténtalo nuevamente.',
        });
        return false;
    } finally {
        // Liberar el lock después de un pequeño delay para evitar clics rápidos
        setTimeout(() => {
            validandoPago = false;
            console.log('🔓 Proceso de pago liberado');
        }, 2000);
    }
}

// ✅ FUNCIONES AUXILIARES PARA FECHAS
function parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return new Date();
    
    const parts = dateString.split('/');
    if (parts.length !== 3) return new Date();
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
}

function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Componente individual de card con lógica corregida
function FacturaCard({ factura, nis, onPagar, onDescargar }) {
    const saldo = parseFloat(factura.SALDO || 0);
    const calculado = calcularImportesFactura(factura);

    return (
        <div className='bg-red-900/40 border border-red-500 p-3 rounded-lg flex flex-col justify-between min-h-[140px] hover:bg-red-900/50 transition-all'>
            <div className='flex justify-between items-start mb-2'>
                <div>
                    <p className='text-red-200 text-xl uppercase'>FACTURA</p>
                    <p className='text-white font-mono text-xl font-bold'>
                        N° {factura.NROFACT}
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-red-200 text-xl uppercase'>SALDO</p>
                    <p className='text-white text-xl font-bold'>
                        ${saldo.toLocaleString()}
                    </p>
                </div>
            </div>
            {/* Vencimientos con estados correctos */}
            <div className='flex-1 mb-3'>
                {/* Primer vencimiento */}
                <div
                    className={`p-2 rounded mb-1 ${
                        calculado.estadoPago1 === 'PAGADO'
                            ? 'bg-blue-900/30 border border-blue-500'
                            : 'bg-green-900/30'
                    }`}
                >
                    <div className='flex justify-between items-center'>
                        <span
                            className={`text-xl ${
                                calculado.estadoPago1 === 'PAGADO'
                                    ? 'text-blue-200'
                                    : 'text-green-200'
                            }`}
                        >
                            1° {factura.CTA1_VTO}
                        </span>
                        <div className='flex items-center gap-1'>
                            <span
                                className={`font-bold text-xl ${
                                    calculado.estadoPago1 === 'PAGADO'
                                        ? 'text-blue-100'
                                        : 'text-green-100'
                                }`}
                            >
                                ${calculado.importe1.toLocaleString()}
                            </span>
                            {calculado.estadoPago1 === 'PAGADO' && (
                                <span className='text-blue-200 text-[10px]'>
                                    ✅
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segundo vencimiento (si existe) */}
                {calculado.tieneSegundoVencimiento && (
                    <div
                        className={`p-2 rounded ${
                            calculado.estadoPago2 === 'PAGADO'
                                ? 'bg-blue-900/30 border border-blue-500'
                                : 'bg-orange-900/30'
                        }`}
                    >
                        <div className='flex justify-between items-center'>
                            <span
                                className={`text-xl ${
                                    calculado.estadoPago2 === 'PAGADO'
                                        ? 'text-blue-200'
                                        : 'text-orange-200'
                                }`}
                            >
                                2° {factura.CTA2_VTO}
                            </span>
                            <div className='flex items-center gap-1'>
                                <span
                                    className={`font-bold text-xl ${
                                        calculado.estadoPago2 === 'PAGADO'
                                            ? 'text-blue-100'
                                            : 'text-orange-100'
                                    }`}
                                >
                                    ${calculado.importe2.toLocaleString()}
                                </span>
                                {calculado.estadoPago2 === 'PAGADO' && (
                                    <span className='text-blue-200 text-[10px]'>
                                        ✅
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Botones */}
            <div className='w-full'>
                <button
                    onClick={() => onPagar(factura)}
                    disabled={!calculado.habilitarPago1 && !calculado.habilitarPago2}
                    className={`w-full px-2 py-2 rounded text-white text-xl font-bold transition-all hover:scale-105 flex items-center justify-center ${
                        calculado.habilitarPago1 || calculado.habilitarPago2
                            ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                >
                    💳 PAGAR
                </button>
            </div>
        </div>
    );
}

// ✅ MODAL MEJORADO CON LOADING STATES Y MEJOR UX
function PaymentModal({ factura, nis }) {
    const calculado = calcularImportesFactura(factura);

    const modalHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif; padding: 10px;">
            <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.3);">
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">FACTURA N° ${factura.NROFACT}</h2>
                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Seleccione el vencimiento a pagar</p>
            </div>
        </div>
    `;

    let footerButtons = '';

    // ✅ PRIMER VENCIMIENTO - Habilitado solo si estado permite
    if (calculado.habilitarPago1 && factura.ESTADO === 'IMPAGA') {
        footerButtons += `
            <div style="margin-bottom: 10px;">
                <div style="background: #f3f4f6; padding: 10px; border-radius: 8px; margin-bottom: 6px;">
                    <h3 style="margin: 0 0 4px 0; color: #374151; font-size: 12px; font-weight: bold;">1° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #6b7280; font-size: 11px;">Fecha: ${factura.CTA1_VTO}</p>
                    <p style="margin: 2px 0; color: #059669; font-size: 16px; font-weight: bold;">$${calculado.importe1.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc1" data-factura="${factura.NROFACT}" data-vencimiento="1" data-fecha="${factura.CTA1_VTO}" data-importe="${calculado.importe1}" style="
                    background: linear-gradient(135deg, #16a34a, #15803d);
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4);
                    transition: all 0.3s;
                    width: 100%;
                    margin-bottom: 6px;
                ">
                    💳 PAGAR 1° VENCIMIENTO
                </button>
            </div>
        `;
    }

    // ✅ SEGUNDO VENCIMIENTO - Solo si estado es PARCIAL o validaciones permiten
    if (calculado.habilitarPago2 && calculado.tieneSegundoVencimiento && factura.ESTADO === 'PARCIAL') {
        footerButtons += `
            <div style="margin-bottom: 10px;">
                <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin-bottom: 6px;">
                    <h3 style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: bold;">2° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #b45309; font-size: 11px;">Fecha: ${factura.CTA2_VTO}</p>
                    <p style="margin: 2px 0; color: #d97706; font-size: 16px; font-weight: bold;">$${calculado.importe2.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc2" data-factura="${factura.NROFACT}" data-vencimiento="2" data-fecha="${factura.CTA2_VTO}" data-importe="${calculado.importe2}" style="
                    background: linear-gradient(135deg, #d97706, #b45309);
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4);
                    transition: all 0.3s;
                    width: 100%;
                ">
                    💳 PAGAR 2° VENCIMIENTO
                </button>
            </div>
        `;
    }

    // ✅ SEGUNDO VENCIMIENTO DESHABILITADO - Mostrar con advertencia si estado es IMPAGA
    if (calculado.tieneSegundoVencimiento && factura.ESTADO === 'IMPAGA') {
        footerButtons += `
            <div style="margin-bottom: 10px;">
                <div style="background: #fee2e2; padding: 10px; border-radius: 8px; margin-bottom: 6px; border: 1px solid #fecaca;">
                    <h3 style="margin: 0 0 4px 0; color: #991b1b; font-size: 12px; font-weight: bold;">2° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #dc2626; font-size: 11px;">Fecha: ${factura.CTA2_VTO}</p>
                    <p style="margin: 2px 0; color: #b91c1c; font-size: 16px; font-weight: bold;">$${calculado.importe2.toLocaleString()}</p>
                    <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 10px; font-style: italic;">⚠️ Debe pagar primero el 1° vencimiento</p>
                </div>
                <button disabled style="
                    background: #9ca3af;
                    color: #6b7280;
                    border: none;
                    padding: 10px 25px;
                    font-size: 14px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: not-allowed;
                    width: 100%;
                    opacity: 0.6;
                ">
                    🚫 NO DISPONIBLE
                </button>
            </div>
        `;
    }

    // Si no hay vencimientos habilitados, mostrar mensaje
    if (!calculado.habilitarPago1 && !calculado.habilitarPago2) {
        footerButtons = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #059669; font-size: 16px; font-weight: bold;">✅ Factura completamente pagada</p>
            </div>
        `;
    }

    return Swal.fire({
        html: modalHTML,
        showCancelButton: false,
        showConfirmButton: false,
        showDenyButton: false,
        width: 450,
        padding: '20px',
        background: '#f9fafb',
        backdrop: 'rgba(0,0,0,0.85)',
        allowOutsideClick: true,
        allowEscapeKey: true,
        showCloseButton: true,
        footer: `<div style="text-align: center;">${footerButtons}</div>`,
        didOpen: () => {
            // ✅ FUNCIÓN MEJORADA PARA MANEJAR CLICS CON LOADING STATES
            const setupButtonClick = (buttonId, vencimiento) => {
                const btn = document.getElementById(buttonId);
                if (!btn) return;

                btn.addEventListener('click', async (e) => {
                    // Prevenir múltiples clics
                    if (btn.disabled) return;
                    
                    // Estado de loading
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '⏳ Validando...';
                    btn.disabled = true;
                    btn.style.cursor = 'not-allowed';
                    btn.style.opacity = '0.7';

                    try {
                        console.log(`🔄 Procesando pago para vencimiento ${vencimiento}`);
                        Swal.close();
                        
                        // Procesar pago con todas las validaciones
                        const resultado = await procesarPago(factura, vencimiento, nis);
                        
                        if (resultado) {
                            console.log('✅ Pago procesado exitosamente');
                        } else {
                            console.log('❌ Pago no procesado');
                        }
                        
                    } catch (error) {
                        console.error('❌ Error en el proceso de pago:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Error inesperado',
                            text: 'Ocurrió un error inesperado. Por favor, inténtalo nuevamente.',
                        });
                    } finally {
                        // Restaurar botón (por si el modal sigue abierto)
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        btn.style.cursor = 'pointer';
                        btn.style.opacity = '1';
                    }
                });

                // ✅ EFECTOS HOVER MEJORADOS
                btn.addEventListener('mouseenter', () => {
                    if (!btn.disabled) {
                        btn.style.transform = 'scale(1.02)';
                        btn.style.boxShadow = vencimiento === 1 
                            ? '0 6px 20px rgba(22, 163, 74, 0.6)'
                            : '0 6px 20px rgba(217, 119, 6, 0.6)';
                    }
                });
                
                btn.addEventListener('mouseleave', () => {
                    if (!btn.disabled) {
                        btn.style.transform = 'scale(1)';
                        btn.style.boxShadow = vencimiento === 1
                            ? '0 4px 15px rgba(22, 163, 74, 0.4)'
                            : '0 4px 15px rgba(217, 119, 6, 0.4)';
                    }
                });
            };

            // Configurar botones
            setupButtonClick('btn-pagar-venc1', 1);
            setupButtonClick('btn-pagar-venc2', 2);
        },
    });
}

// Componente principal
export default function TASFacturasGrid({ facturasImpagas, nis }) {
    if (!facturasImpagas.length) {
        return (
            <div className='bg-green-800/30 p-4 rounded-xl text-center'>
                <p className='text-lg text-green-200'>
                    ✅ No tienes facturas pendientes
                </p>
            </div>
        );
    }

    const handlePagar = (factura) => {
        PaymentModal({ factura, nis });
    };

    const handleDescargar = async (factura) => {
        try {
            await downloadFactura(factura, nis);
        } catch (error) {
            console.error('Error al descargar factura:', error);
        }
    };

    return (
        <div className='bg-green-800/30 p-2 rounded-lg flex-1 overflow-hidden'>
            <h3 className='text-base font-bold mb-2 text-lime-200 text-center'>
                FACTURAS PENDIENTES ({facturasImpagas.length})
            </h3>
            {/* GRILLA CON MENOS COLUMNAS para cards más grandes */}
            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-3 auto-rows-max'>
                {[...facturasImpagas]
                    .sort((a, b) => {
                        const [dayA, monthA, yearA] = a.CTA1_VTO.split('/').map(Number);
                        const [dayB, monthB, yearB] = b.CTA1_VTO.split('/').map(Number);
                        const dateA = new Date(yearA, monthA - 1, dayA);
                        const dateB = new Date(yearB, monthB - 1, dayB);
                        return dateA - dateB;
                    })
                    .map((factura, index) => (
                        <FacturaCard
                            key={index}
                            factura={factura}
                            nis={nis}
                            onPagar={handlePagar}
                            onDescargar={handleDescargar}
                        />
                    ))}
            </div>
        </div>
    );
}