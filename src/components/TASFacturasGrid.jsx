import Swal from 'sweetalert2';
import { processPayment } from '../services/paymentService';
import { downloadFactura, isVencido } from '../services/facturaService';
import { useEffect, useState } from 'react';

// Función corregida para calcular importes y estados
function calcularImportesFactura(factura) {
    const estado = factura.ESTADO;
    const cta1Imp = parseFloat(factura.CTA1_IMP || 0);
    const cta2Imp = parseFloat(factura.CTA2_IMP || 0);
    const saldo = parseFloat(factura.SALDO || 0);

    let importe1Mostrar = 0;
    let importe2Mostrar = 0;
    let habilitarPago1 = false;
    let habilitarPago2 = false;
    let estadoPago1 = 'PENDIENTE';
    let estadoPago2 = 'PENDIENTE';

    // Si el saldo es 0, la factura está completamente pagada
    if (saldo === 0 || estado === 'PAGADA') {
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = false;
        habilitarPago2 = false;
        estadoPago1 = 'PAGADO';
        estadoPago2 = cta2Imp > 0 ? 'PAGADO' : 'NO_DISPONIBLE';
    } else if (estado === 'IMPAGA') {
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = true;
        habilitarPago2 = cta2Imp > 0;
        estadoPago1 = 'PENDIENTE';
        estadoPago2 = cta2Imp > 0 ? 'PENDIENTE' : 'NO_DISPONIBLE';
    } else if (estado === 'PARCIAL') {
        importe1Mostrar = cta1Imp;
        importe2Mostrar = cta2Imp;
        habilitarPago1 = false;
        habilitarPago2 = true;
        estadoPago1 = 'PAGADO';
        estadoPago2 = 'PENDIENTE';
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

// Función para contar facturas realmente pendientes
function contarFacturasPendientes(facturas) {
    return facturas.filter((factura) => {
        const calculado = calcularImportesFactura(factura);
        return calculado.habilitarPago1 || calculado.habilitarPago2;
    }).length;
}

// Card moderna para TAS con colores originales
function FacturaCard({ factura, nis, onPagar, onDescargar }) {
    const saldo = parseFloat(factura.SALDO || 0);
    const calculado = calcularImportesFactura(factura);
    const estaVencido = isVencido(factura.CTA1_VTO);

    return (
        <div
            className={`border p-4 rounded-lg transition-all transform hover:scale-105 h-full flex flex-col justify-between ${
                calculado.habilitarPago1 || calculado.habilitarPago2
                    ? 'bg-red-900/50 border-red-400 hover:bg-red-900/60 shadow-lg hover:shadow-red-500/30 cursor-pointer animate-pulse'
                    : 'bg-red-900/20 border-red-600/40 hover:bg-red-900/25'
            }`}
            onClick={
                calculado.habilitarPago1 || calculado.habilitarPago2
                    ? () => onPagar(factura)
                    : undefined
            }
            style={{
                cursor:
                    calculado.habilitarPago1 || calculado.habilitarPago2
                        ? 'pointer'
                        : 'default',
            }}
        >
            {/* Header de la factura */}
            <div className='flex justify-between items-start mb-3'>
                <div>
                    <p className='text-red-200 text-sm uppercase'>FACTURA</p>
                    <p className='text-white font-mono text-lg font-bold'>
                        N° {factura.NROFACT}
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-red-200 text-sm uppercase'>SALDO</p>
                    <p className='text-white text-lg font-bold'>
                        ${saldo.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Vencimientos con colores originales */}
            <div className='flex-1 mb-3'>
                {/* Primer vencimiento */}
                <div
                    className={`p-3 rounded mb-2 ${
                        calculado.estadoPago1 === 'PAGADO'
                            ? 'bg-blue-900/30 border border-blue-500'
                            : 'bg-green-900/30'
                    }`}
                >
                    <div className='flex justify-between items-center'>
                        <span
                            className={`text-sm ${
                                calculado.estadoPago1 === 'PAGADO'
                                    ? 'text-blue-200'
                                    : 'text-green-200'
                            }`}
                        >
                            1° {factura.CTA1_VTO}
                            {estaVencido && ' ⚠️'}
                        </span>
                        <div className='flex items-center gap-1'>
                            <span
                                className={`font-bold text-sm ${
                                    calculado.estadoPago1 === 'PAGADO'
                                        ? 'text-blue-100'
                                        : 'text-green-100'
                                }`}
                            >
                                ${calculado.importe1.toLocaleString()}
                            </span>
                            {calculado.estadoPago1 === 'PAGADO' && (
                                <span className='text-blue-200 text-sm'>
                                    ✅
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segundo vencimiento */}
                {calculado.tieneSegundoVencimiento && (
                    <div
                        className={`p-3 rounded ${
                            calculado.estadoPago2 === 'PAGADO'
                                ? 'bg-blue-900/30 border border-blue-500'
                                : 'bg-orange-900/30'
                        }`}
                    >
                        <div className='flex justify-between items-center'>
                            <span
                                className={`text-sm ${
                                    calculado.estadoPago2 === 'PAGADO'
                                        ? 'text-blue-200'
                                        : 'text-orange-200'
                                }`}
                            >
                                2° {factura.CTA2_VTO}
                            </span>
                            <div className='flex items-center gap-1'>
                                <span
                                    className={`font-bold text-sm ${
                                        calculado.estadoPago2 === 'PAGADO'
                                            ? 'text-blue-100'
                                            : 'text-orange-100'
                                    }`}
                                >
                                    ${calculado.importe2.toLocaleString()}
                                </span>
                                {calculado.estadoPago2 === 'PAGADO' && (
                                    <span className='text-blue-200 text-sm'>
                                        ✅
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Call to action mejorado para facturas pendientes */}
            {(calculado.habilitarPago1 || calculado.habilitarPago2) && (
                <div className='text-center p-4 bg-gradient-to-r from-green-600 to-green-500 rounded-lg shadow-lg hover:shadow-green-500/50 transition-all transform hover:scale-105 border-2 border-green-400'>
                    <p className='text-white font-bold text-lg animate-bounce'>
                        👆 TOCAR PARA PAGAR
                    </p>
                    <p className='text-green-100 text-sm mt-1'>
                        ¡Pago disponible!
                    </p>
                </div>
            )}

            {/* Estado para facturas pagadas */}
            {!calculado.habilitarPago1 && !calculado.habilitarPago2 && (
                <div className='text-center p-3 bg-blue-800/30 rounded border border-blue-500/30'>
                    <p className='text-blue-200 font-semibold text-sm'>
                        ✅ FACTURA PAGADA
                    </p>
                </div>
            )}
        </div>
    );
}

// Modal con colores originales
function PaymentModal({ factura, nis }) {
    const calculado = calcularImportesFactura(factura);

    const modalHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif; padding: 12px;">
            <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.3);">
                <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold;">FACTURA N° ${factura.NROFACT}</h2>
                <p style="margin: 0; font-size: 16px; opacity: 0.9;">Seleccione el vencimiento a pagar</p>
            </div>
        </div>
    `;

    let footerButtons = '';

    // Primer vencimiento
    if (calculado.habilitarPago1) {
        footerButtons += `
            <div style="margin-bottom: 12px;">
                <div style="background: rgba(34, 197, 94, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(34, 197, 94, 0.3);">
                    <h3 style="margin: 0 0 4px 0; color: #16a34a; font-size: 14px; font-weight: bold;">1° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #374151; font-size: 12px;">Fecha: ${
                        factura.CTA1_VTO
                    }</p>
                    <p style="margin: 2px 0; color: #16a34a; font-size: 18px; font-weight: bold;">$${calculado.importe1.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc1" data-factura="${
                    factura.NROFACT
                }" data-vencimiento="1" data-fecha="${
            factura.CTA1_VTO
        }" data-importe="${calculado.importe1}" style="
                    background: linear-gradient(135deg, #16a34a, #15803d);
                    color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: bold;
                    border-radius: 8px; cursor: pointer; width: 100%; margin-bottom: 6px;
                    box-shadow: 0 4px 15px rgba(22, 163, 74, 0.4); transition: all 0.3s;
                ">💳 PAGAR 1° VENCIMIENTO</button>
            </div>
        `;
    }

    // Segundo vencimiento
    if (calculado.habilitarPago2 && calculado.tieneSegundoVencimiento) {
        footerButtons += `
            <div style="margin-bottom: 12px;">
                <div style="background: rgba(234, 179, 8, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid rgba(234, 179, 8, 0.3);">
                    <h3 style="margin: 0 0 4px 0; color: #d97706; font-size: 14px; font-weight: bold;">2° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #374151; font-size: 12px;">Fecha: ${
                        factura.CTA2_VTO
                    }</p>
                    <p style="margin: 2px 0; color: #d97706; font-size: 18px; font-weight: bold;">$${calculado.importe2.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc2" data-factura="${
                    factura.NROFACT
                }" data-vencimiento="2" data-fecha="${
            factura.CTA2_VTO
        }" data-importe="${calculado.importe2}" style="
                    background: linear-gradient(135deg, #d97706, #b45309);
                    color: white; border: none; padding: 12px 25px; font-size: 16px; font-weight: bold;
                    border-radius: 8px; cursor: pointer; width: 100%;
                    box-shadow: 0 4px 15px rgba(217, 119, 6, 0.4); transition: all 0.3s;
                ">💳 PAGAR 2° VENCIMIENTO</button>
            </div>
        `;
    }

    if (!calculado.habilitarPago1 && !calculado.habilitarPago2) {
        footerButtons = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: #059669; font-size: 18px; font-weight: bold;">✅ Factura completamente pagada</p>
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
            const btnVenc1 = document.getElementById('btn-pagar-venc1');
            const btnVenc2 = document.getElementById('btn-pagar-venc2');

            if (btnVenc1) {
                btnVenc1.addEventListener('click', (e) => {
                    const button = e.target.closest('button');
                    const paymentData = {
                        factura: button.dataset.factura,
                        vencimiento: button.dataset.vencimiento,
                        fecha: button.dataset.fecha,
                        importe: button.dataset.importe,
                    };
                    Swal.close();
                    processPayment(paymentData, nis);
                });

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
                    const button = e.target.closest('button');
                    const paymentData = {
                        factura: button.dataset.factura,
                        vencimiento: button.dataset.vencimiento,
                        fecha: button.dataset.fecha,
                        importe: button.dataset.importe,
                    };
                    Swal.close();
                    processPayment(paymentData, nis);
                });

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

// Función para calcular columnas dinámicamente
function calcularColumnasGrid(cantidadFacturas) {
    if (cantidadFacturas <= 3) return 'grid-cols-3';
    if (cantidadFacturas <= 4) return 'grid-cols-4';
    if (cantidadFacturas <= 6) return 'grid-cols-3';
    if (cantidadFacturas <= 8) return 'grid-cols-4';
    if (cantidadFacturas <= 9) return 'grid-cols-3';
    if (cantidadFacturas <= 12) return 'grid-cols-4';
    if (cantidadFacturas <= 15) return 'grid-cols-5';
    return 'grid-cols-6'; // máximo 6 columnas
}

// Función para calcular filas máximas
function calcularFilasMaximas(cantidadFacturas) {
    if (cantidadFacturas <= 6) return 2;
    if (cantidadFacturas <= 12) return 3;
    return 4; // máximo 4 filas
}

// Componente principal con grid auto-ajustable
export default function TASFacturasGrid({ facturasImpagas, nis }) {
    if (!facturasImpagas.length) {
        return (
            <div className='bg-green-800/30 p-6 rounded-xl text-center'>
                <div className='text-6xl mb-4'>✅</div>
                <p className='text-2xl text-green-200 font-bold'>
                    No tienes facturas pendientes
                </p>
                <p className='text-green-300 text-lg mt-2'>
                    ¡Tu cuenta está al día!
                </p>
            </div>
        );
    }

    const facturasPendientes = contarFacturasPendientes(facturasImpagas);
    const filasMaximas = calcularFilasMaximas(facturasImpagas.length);
    const columnasGrid = calcularColumnasGrid(facturasImpagas.length);
    const facturasMostrar = Math.min(
        facturasImpagas.length,
        filasMaximas * parseInt(columnasGrid.split('-')[2])
    );

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
        <div className='bg-green-800/30 p-4 rounded-lg flex-1 flex flex-col overflow-hidden'>
            <h3 className='text-xl font-bold mb-4 text-lime-200 text-center'>
                FACTURAS PENDIENTES ({facturasPendientes})
            </h3>

            {/* Grid auto-ajustable sin scroll */}
            <div className='flex-1 min-h-0'>
                <div
                    className={`grid ${columnasGrid} gap-4 h-full auto-rows-fr`}
                >
                    {facturasImpagas
                        .slice(0, facturasMostrar)
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

            {/* Indicador de más facturas */}
            {facturasImpagas.length > facturasMostrar && (
                <div className='text-center mt-3 p-2 bg-yellow-900/40 border border-yellow-500 rounded'>
                    <p className='text-yellow-200 text-sm font-semibold'>
                        📋 +{facturasImpagas.length - facturasMostrar} facturas
                        adicionales
                    </p>
                </div>
            )}
        </div>
    );
}