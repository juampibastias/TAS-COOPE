import Swal from 'sweetalert2';
import { processPayment } from '../services/paymentService';
import { downloadFactura, isVencido } from '../services/facturaService';


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
        habilitarPago2 = cta2Imp > 0; // Solo si hay segundo vencimiento
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

// Componente individual de card con lógica corregida
function FacturaCard({ factura, nis, onPagar, onDescargar }) {
    const saldo = parseFloat(factura.SALDO || 0);
    const calculado = calcularImportesFactura(factura);

    return (
        <div className='bg-red-900/40 border border-red-500 p-3 rounded-lg flex flex-col justify-between min-h-[140px] hover:bg-red-900/50 transition-all'>
            <div className='flex justify-between items-start mb-2'>
                <div>
                    <p className='text-red-200 text-xs uppercase'>FACTURA</p>
                    <p className='text-white font-mono text-sm font-bold'>
                        N° {factura.NROFACT}
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-red-200 text-xs uppercase'>SALDO</p>
                    <p className='text-white text-sm font-bold'>
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
                            className={`text-xs ${
                                calculado.estadoPago1 === 'PAGADO'
                                    ? 'text-blue-200'
                                    : 'text-green-200'
                            }`}
                        >
                            1° {factura.CTA1_VTO}
                        </span>
                        <div className='flex items-center gap-1'>
                            <span
                                className={`font-bold text-xs ${
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
                                className={`text-xs ${
                                    calculado.estadoPago2 === 'PAGADO'
                                        ? 'text-blue-200'
                                        : 'text-orange-200'
                                }`}
                            >
                                2° {factura.CTA2_VTO}
                            </span>
                            <div className='flex items-center gap-1'>
                                <span
                                    className={`font-bold text-xs ${
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
            <div className='grid grid-cols-2 gap-2'>
                <button
                    onClick={() => onPagar(factura)}
                    disabled={
                        !calculado.habilitarPago1 && !calculado.habilitarPago2
                    }
                    className={`px-2 py-2 rounded text-white text-xs font-bold transition-all hover:scale-105 flex items-center justify-center ${
                        calculado.habilitarPago1 || calculado.habilitarPago2
                            ? 'bg-green-600 hover:bg-green-500 cursor-pointer'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                    }`}
                >
                    💳 PAGAR
                </button>
                <button
                    onClick={() => onDescargar(factura)}
                    className='bg-blue-600 hover:bg-blue-500 px-2 py-2 rounded text-white text-xs font-bold transition-all hover:scale-105 flex items-center justify-center'
                >
                    📄 IMPRIMIR
                </button>
            </div>
        </div>
    );
}

// Modal de selección de vencimiento con lógica corregida
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

    // Primer vencimiento (solo si está habilitado)
    if (calculado.habilitarPago1) {
        footerButtons += `
            <div style="margin-bottom: 10px;">
                <div style="background: #f3f4f6; padding: 10px; border-radius: 8px; margin-bottom: 6px;">
                    <h3 style="margin: 0 0 4px 0; color: #374151; font-size: 12px; font-weight: bold;">1° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #6b7280; font-size: 11px;">Fecha: ${
                        factura.CTA1_VTO
                    }</p>
                    <p style="margin: 2px 0; color: #059669; font-size: 16px; font-weight: bold;">$${calculado.importe1.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc1" data-factura="${
                    factura.NROFACT
                }" data-vencimiento="1" data-fecha="${
            factura.CTA1_VTO
        }" data-importe="${calculado.importe1}" style="
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

    // Segundo vencimiento (solo si está habilitado)
    if (calculado.habilitarPago2 && calculado.tieneSegundoVencimiento) {
        footerButtons += `
            <div style="margin-bottom: 10px;">
                <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin-bottom: 6px;">
                    <h3 style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: bold;">2° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #b45309; font-size: 11px;">Fecha: ${
                        factura.CTA2_VTO
                    }</p>
                    <p style="margin: 2px 0; color: #d97706; font-size: 16px; font-weight: bold;">$${calculado.importe2.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc2" data-factura="${
                    factura.NROFACT
                }" data-vencimiento="2" data-fecha="${
            factura.CTA2_VTO
        }" data-importe="${calculado.importe2}" style="
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
            // Event listeners para ambos vencimientos
            const btnVenc1 = document.getElementById('btn-pagar-venc1');
            const btnVenc2 = document.getElementById('btn-pagar-venc2');

            if (btnVenc1) {
                btnVenc1.addEventListener('click', (e) => {
                    const button = e.target;
                    const paymentData = {
                        factura: button.dataset.factura,
                        vencimiento: button.dataset.vencimiento,
                        fecha: button.dataset.fecha,
                        importe: button.dataset.importe,
                    };
                    Swal.close();
                    processPayment(paymentData, nis);
                });

                // Efectos hover
                btnVenc1.addEventListener('mouseenter', () => {
                    btnVenc1.style.transform = 'scale(1.02)';
                    btnVenc1.style.boxShadow =
                        '0 6px 20px rgba(22, 163, 74, 0.6)';
                });
                btnVenc1.addEventListener('mouseleave', () => {
                    btnVenc1.style.transform = 'scale(1)';
                    btnVenc1.style.boxShadow =
                        '0 4px 15px rgba(22, 163, 74, 0.4)';
                });
            }

            if (btnVenc2) {
                btnVenc2.addEventListener('click', (e) => {
                    const button = e.target;
                    const paymentData = {
                        factura: button.dataset.factura,
                        vencimiento: button.dataset.vencimiento,
                        fecha: button.dataset.fecha,
                        importe: button.dataset.importe,
                    };
                    Swal.close();
                    processPayment(paymentData, nis);
                });

                // Efectos hover
                btnVenc2.addEventListener('mouseenter', () => {
                    btnVenc2.style.transform = 'scale(1.02)';
                    btnVenc2.style.boxShadow =
                        '0 6px 20px rgba(217, 119, 6, 0.6)';
                });
                btnVenc2.addEventListener('mouseleave', () => {
                    btnVenc2.style.transform = 'scale(1)';
                    btnVenc2.style.boxShadow =
                        '0 4px 15px rgba(217, 119, 6, 0.4)';
                });
            }
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
            // En cualquier componente
            <button
                onClick={() => {
                    import('../services/browserPrintService').then((module) => {
                        module.testImpresion();
                    });
                }}
            >
                🖨️ TEST IMPRESIÓN
            </button>
            <h3 className='text-base font-bold mb-2 text-lime-200 text-center'>
                FACTURAS PENDIENTES ({facturasImpagas.length})
            </h3>
            {/* GRILLA CON MENOS COLUMNAS para cards más grandes */}
            <div className='h-full overflow-y-auto'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 auto-rows-max'>
                    {facturasImpagas.map((factura, index) => (
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
        </div>
    );
}
