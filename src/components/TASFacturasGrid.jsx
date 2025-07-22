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

function contarFacturasPendientes(facturas) {
    return facturas.filter((factura) => {
        const calculado = calcularImportesFactura(factura);
        return calculado.habilitarPago1 || calculado.habilitarPago2;
    }).length;
}

// ✅ TARJETA ULTRA COMPACTA - ESCALADO AGRESIVO
function TASFacturaCard({ factura, nis, onPagar, totalFacturas }) {
    const saldo = parseFloat(factura.SALDO || 0);
    const calculado = calcularImportesFactura(factura);
    const estaVencido = isVencido(factura.CTA1_VTO);
    const puedeTocar = calculado.habilitarPago1 || calculado.habilitarPago2;

    // ✅ ESCALADO ULTRA AGRESIVO PARA EVITAR SCROLL
    const getScaling = () => {
        if (totalFacturas <= 2) return { font: '14px', padding: '8px' };
        if (totalFacturas <= 3) return { font: '12px', padding: '6px' };
        if (totalFacturas <= 6) return { font: '11px', padding: '5px' };
        return { font: '10px', padding: '4px' };
    };

    const scale = getScaling();

    const handleClick = () => {
        if (puedeTocar) {
            onPagar(factura);
        }
    };

    return (
        <div 
            style={{
                height: '100%',
                backgroundColor: puedeTocar ? '#047857' : '#1e40af',
                border: puedeTocar ? '2px solid #fbbf24' : '2px solid #60a5fa',
                borderRadius: '6px',
                color: 'white',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
                cursor: puedeTocar ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}
            onClick={handleClick}
        >
            {/* INDICADOR ESQUINA - MÁS PEQUEÑO */}
            <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                backgroundColor: puedeTocar ? '#dc2626' : '#16a34a',
                color: 'white',
                padding: '2px 6px',
                fontSize: '8px',
                fontWeight: 'bold',
                borderBottomLeftRadius: '4px',
                zIndex: 10
            }}>
                {puedeTocar ? 'PEND' : 'PAGADA'}
            </div>

            {/* HEADER ULTRA COMPACTO */}
            <div style={{
                backgroundColor: 'rgba(0,0,0,0.2)',
                padding: `${scale.padding} ${scale.padding} calc(${scale.padding} / 2) ${scale.padding}`,
                textAlign: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.3)',
                flex: '0 0 auto'
            }}>
                <div style={{
                    fontSize: `calc(${scale.font} + 1px)`,
                    fontWeight: 'bold',
                    marginBottom: '2px',
                    lineHeight: '1.1'
                }}>
                    N° {factura.NROFACT}
                </div>
                <div style={{
                    fontSize: scale.font,
                    color: '#fbbf24',
                    fontWeight: 'bold',
                    lineHeight: '1.1'
                }}>
                    ${saldo.toLocaleString()}
                </div>
            </div>

            {/* VENCIMIENTOS COMPACTOS */}
            <div style={{
                padding: `calc(${scale.padding} / 2) ${scale.padding}`,
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: `calc(${scale.padding} / 2)`,
                minHeight: '0'
            }}>
                {/* PRIMER VENCIMIENTO */}
                <div style={{
                    backgroundColor: calculado.estadoPago1 === 'PAGADO' 
                        ? 'rgba(34, 197, 94, 0.3)' 
                        : 'rgba(245, 158, 11, 0.3)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '4px',
                    padding: `calc(${scale.padding} / 2)`,
                    flex: calculado.tieneSegundoVencimiento ? '1' : '2',
                    minHeight: '0'
                }}>
                    <div style={{
                        fontSize: `calc(${scale.font} - 1px)`,
                        fontWeight: 'bold',
                        marginBottom: '1px',
                        lineHeight: '1.1',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>1° {factura.CTA1_VTO}</span>
                        {estaVencido && <span style={{ color: '#ef4444', fontSize: '8px' }}>⚠️</span>}
                    </div>
                    <div style={{
                        fontSize: scale.font,
                        fontWeight: 'bold',
                        marginBottom: '1px',
                        lineHeight: '1.1'
                    }}>
                        ${calculado.importe1.toLocaleString()}
                    </div>
                    <div style={{
                        fontSize: `calc(${scale.font} - 2px)`,
                        color: calculado.estadoPago1 === 'PAGADO' ? '#86efac' : '#fde047',
                        lineHeight: '1.1'
                    }}>
                        {calculado.estadoPago1 === 'PAGADO' ? '✅ PAGADO' : '⏳ PEND'}
                    </div>
                </div>

                {/* SEGUNDO VENCIMIENTO */}
                {calculado.tieneSegundoVencimiento && (
                    <div style={{
                        backgroundColor: calculado.estadoPago2 === 'PAGADO' 
                            ? 'rgba(34, 197, 94, 0.3)' 
                            : 'rgba(245, 158, 11, 0.3)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '4px',
                        padding: `calc(${scale.padding} / 2)`,
                        flex: '1',
                        minHeight: '0'
                    }}>
                        <div style={{
                            fontSize: `calc(${scale.font} - 1px)`,
                            fontWeight: 'bold',
                            marginBottom: '1px',
                            lineHeight: '1.1'
                        }}>
                            2° {factura.CTA2_VTO}
                        </div>
                        <div style={{
                            fontSize: scale.font,
                            fontWeight: 'bold',
                            marginBottom: '1px',
                            lineHeight: '1.1'
                        }}>
                            ${calculado.importe2.toLocaleString()}
                        </div>
                        <div style={{
                            fontSize: `calc(${scale.font} - 2px)`,
                            color: calculado.estadoPago2 === 'PAGADO' ? '#86efac' : '#fde047',
                            lineHeight: '1.1'
                        }}>
                            {calculado.estadoPago2 === 'PAGADO' ? '✅ PAGADO' : '⏳ PEND'}
                        </div>
                    </div>
                )}
            </div>

            {/* BOTÓN ULTRA COMPACTO */}
            <div style={{
                padding: `calc(${scale.padding} / 2) ${scale.padding} ${scale.padding} ${scale.padding}`,
                borderTop: '1px solid rgba(255,255,255,0.3)',
                flex: '0 0 auto'
            }}>
                <div style={{
                    backgroundColor: puedeTocar ? '#f59e0b' : '#64748b',
                    borderRadius: '4px',
                    padding: `calc(${scale.padding} / 2)`,
                    textAlign: 'center',
                    fontSize: `calc(${scale.font} - 1px)`,
                    fontWeight: 'bold',
                    minHeight: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    lineHeight: '1'
                }}>
                    {puedeTocar ? (
                        <>
                            <span style={{ fontSize: '10px' }}>👆</span>
                            PAGAR
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: '10px' }}>✅</span>
                            PAGADA
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Modal simplificado
function TASPaymentModal({ factura, nis }) {
    const calculado = calcularImportesFactura(factura);

    const modalHTML = `
        <div style="font-family: Arial, sans-serif; padding: 15px;">
            <div style="background: #047857; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">FACTURA N° ${factura.NROFACT}</h2>
                <p style="margin: 0; font-size: 14px;">Seleccione el vencimiento a pagar</p>
            </div>
        </div>
    `;

    let footerButtons = '';

    if (calculado.habilitarPago1) {
        footerButtons += `
            <div style="margin-bottom: 12px;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 8px; border: 2px solid rgba(16, 185, 129, 0.4);">
                    <h3 style="margin: 0 0 4px 0; color: #10b981; font-size: 14px; font-weight: bold;">1° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #374151; font-size: 12px;">Fecha: ${factura.CTA1_VTO}</p>
                    <p style="margin: 2px 0; color: #10b981; font-size: 16px; font-weight: bold;">$${calculado.importe1.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc1" data-factura="${factura.NROFACT}" data-vencimiento="1" data-fecha="${factura.CTA1_VTO}" data-importe="${calculado.importe1}" style="
                    background: #10b981; color: white; border: none; padding: 12px 16px; font-size: 14px; font-weight: bold; 
                    border-radius: 6px; cursor: pointer; width: 100%; min-height: 45px;
                ">💳 PAGAR 1° VENCIMIENTO</button>
            </div>
        `;
    }

    if (calculado.habilitarPago2 && calculado.tieneSegundoVencimiento) {
        footerButtons += `
            <div style="margin-bottom: 12px;">
                <div style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 6px; margin-bottom: 8px; border: 2px solid rgba(245, 158, 11, 0.4);">
                    <h3 style="margin: 0 0 4px 0; color: #f59e0b; font-size: 14px; font-weight: bold;">2° VENCIMIENTO</h3>
                    <p style="margin: 2px 0; color: #374151; font-size: 12px;">Fecha: ${factura.CTA2_VTO}</p>
                    <p style="margin: 2px 0; color: #f59e0b; font-size: 16px; font-weight: bold;">$${calculado.importe2.toLocaleString()}</p>
                </div>
                <button id="btn-pagar-venc2" data-factura="${factura.NROFACT}" data-vencimiento="2" data-fecha="${factura.CTA2_VTO}" data-importe="${calculado.importe2}" style="
                    background: #f59e0b; color: white; border: none; padding: 12px 16px; font-size: 14px; font-weight: bold; 
                    border-radius: 6px; cursor: pointer; width: 100%; min-height: 45px;
                ">💳 PAGAR 2° VENCIMIENTO</button>
            </div>
        `;
    }

    return Swal.fire({
        html: modalHTML,
        showCancelButton: false,
        showConfirmButton: false,
        width: 400,
        padding: '15px',
        background: '#f8fafc',
        backdrop: 'rgba(0,0,0,0.8)',
        allowOutsideClick: true,
        showCloseButton: true,
        footer: `<div>${footerButtons}</div>`,
        didOpen: () => {
            ['btn-pagar-venc1', 'btn-pagar-venc2'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('click', (e) => {
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
                }
            });
        },
    });
}

// ✅ GRID CON ALTURA FIJA CALCULADA
function calcularGridCSS(cantidadFacturas) {
    // ✅ ALTURA MÁXIMA DISPONIBLE - Resto de header + padding
    const alturaDisponible = 'calc(100vh - 320px)'; // 320px = headers + padding + margin
    
    if (cantidadFacturas <= 2) {
        return {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            height: alturaDisponible,
            gridTemplateRows: '1fr'
        };
    } else if (cantidadFacturas <= 4) {
        return {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            height: alturaDisponible,
            gridTemplateRows: 'repeat(2, 1fr)'
        };
    } else if (cantidadFacturas <= 6) {
        return {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '5px',
            height: alturaDisponible,
            gridTemplateRows: 'repeat(2, 1fr)'
        };
    } else if (cantidadFacturas <= 9) {
        return {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '4px',
            height: alturaDisponible,
            gridTemplateRows: 'repeat(3, 1fr)'
        };
    } else {
        return {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3px',
            height: alturaDisponible,
            gridTemplateRows: 'repeat(3, 1fr)'
        };
    }
}

// ✅ COMPONENTE PRINCIPAL CON ALTURA FIJA
export default function TASFacturasGrid({ facturasImpagas, nis }) {
    if (!facturasImpagas.length) {
        return (
            <div style={{
                height: 'calc(100vh - 280px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderRadius: '12px',
                border: '3px solid rgba(16, 185, 129, 0.5)',
                margin: '12px'
            }}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                    <div style={{ fontSize: '50px', marginBottom: '10px' }}>✅</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', color: '#10b981' }}>
                        ¡Excelente!
                    </h2>
                    <p style={{ fontSize: '16px', color: '#34d399', margin: '0' }}>
                        No tienes facturas pendientes
                    </p>
                </div>
            </div>
        );
    }

    const facturasPendientes = contarFacturasPendientes(facturasImpagas);
    const facturasMostrar = Math.min(facturasImpagas.length, 12);
    const gridStyle = calcularGridCSS(facturasMostrar);

    const handlePagar = (factura) => {
        TASPaymentModal({ factura, nis });
    };

    return (
        <div style={{
            backgroundColor: 'rgba(5, 150, 105, 0.15)',
            borderRadius: '12px',
            border: '3px solid rgba(5, 150, 105, 0.4)',
            margin: '12px',
            padding: '10px',
            height: 'calc(100vh - 280px)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            {/* Header compacto */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '10px',
                flex: '0 0 auto'
            }}>
                <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#10b981',
                    margin: '0'
                }}>
                    FACTURAS PENDIENTES
                </h3>
                <div style={{
                    backgroundColor: '#dc2626',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px'
                }}>
                    {facturasPendientes} pendientes
                </div>
            </div>

            {/* Grid con altura fija */}
            <div style={gridStyle}>
                {facturasImpagas
                    .slice(0, facturasMostrar)
                    .map((factura, index) => (
                        <TASFacturaCard
                            key={`${factura.NROFACT}-${index}`}
                            factura={factura}
                            nis={nis}
                            onPagar={handlePagar}
                            totalFacturas={facturasMostrar}
                        />
                    ))}
            </div>

            {/* Indicador de facturas adicionales - Pegado abajo */}
            {facturasImpagas.length > facturasMostrar && (
                <div style={{ 
                    textAlign: 'center', 
                    marginTop: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    padding: '6px',
                    borderRadius: '6px',
                    border: '2px solid rgba(245, 158, 11, 0.5)',
                    flex: '0 0 auto'
                }}>
                    <p style={{ 
                        color: '#f59e0b', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        margin: '0'
                    }}>
                        📋 +{facturasImpagas.length - facturasMostrar} facturas adicionales
                    </p>
                </div>
            )}
        </div>
    );
}