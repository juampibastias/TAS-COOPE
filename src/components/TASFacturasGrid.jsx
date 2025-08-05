import { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { processPayment, showPaymentMethodSelector } from '../services/paymentService';

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
    } else if (estado === 'PAGADA') {
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

// Componente individual de card con selección múltiple
function FacturaCard({ 
    factura, 
    nis, 
    selectedVencimientos, 
    onToggleVencimiento
}) {
    const saldo = parseFloat(factura.SALDO || 0);
    const calculado = calcularImportesFactura(factura);

    const venc1Id = `${factura.NROFACT}-1`;
    const venc2Id = `${factura.NROFACT}-2`;
    
    const isVenc1Selected = selectedVencimientos.some(v => v.id === venc1Id);
    const isVenc2Selected = selectedVencimientos.some(v => v.id === venc2Id);

    const handleVencimientoClick = (tipo) => {
        console.log('🖱️ Click en vencimiento:', tipo, 'de factura:', factura.NROFACT);
        
        const calculadoActual = calcularImportesFactura(factura);
        const habilitado = tipo === '1' ? calculadoActual.habilitarPago1 : calculadoActual.habilitarPago2;
        
        if (!habilitado) {
            console.log('❌ Vencimiento no habilitado:', tipo);
            return;
        }
        
        const vencimientoData = {
            id: `${factura.NROFACT}-${tipo}`,
            nroFactura: factura.NROFACT,
            tipo: tipo === '1' ? '1° Vencimiento' : '2° Vencimiento',
            fecha: tipo === '1' ? factura.CTA1_VTO : factura.CTA2_VTO,
            importe: tipo === '1' ? calculadoActual.importe1 : calculadoActual.importe2,
            estado: factura.ESTADO,
            facturaCompleta: factura,
            paymentData: {
                factura: factura.NROFACT,
                vencimiento: tipo,
                fecha: tipo === '1' ? factura.CTA1_VTO : factura.CTA2_VTO,
                importe: tipo === '1' ? calculadoActual.importe1 : calculadoActual.importe2,
            }
        };
        
        console.log('📤 Enviando vencimientoData:', vencimientoData);
        onToggleVencimiento(vencimientoData);
    };

    return (
        <div className='bg-red-900/40 border border-red-500 p-4 rounded-lg flex flex-col justify-between min-h-[180px] hover:bg-red-900/50 transition-all'>
            <div className='flex justify-between items-start mb-3'>
                <div>
                    <p className='text-red-200 text-sm uppercase font-semibold'>FACTURA</p>
                    <p className='text-white font-mono text-lg font-bold'>
                        N° {factura.NROFACT}
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-red-200 text-sm uppercase font-semibold'>SALDO</p>
                    <p className='text-white text-lg font-bold'>
                        ${saldo.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Vencimientos con checkboxes MÁS GRANDES */}
            <div className='flex-1 mb-4 space-y-2'>
                {/* Primer vencimiento */}
                <div
                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                        calculado.estadoPago1 === 'PAGADO'
                            ? 'bg-blue-900/30 border-blue-500'
                            : calculado.habilitarPago1
                            ? isVenc1Selected 
                                ? 'bg-green-700/60 border-green-400 shadow-lg shadow-green-500/30' 
                                : 'bg-green-900/30 hover:bg-green-800/50 border-green-700'
                            : 'bg-gray-700/30 cursor-not-allowed opacity-60 border-gray-600'
                    }`}
                    onClick={() => calculado.habilitarPago1 && handleVencimientoClick('1')}
                >
                    <div className='flex justify-between items-center'>
                        <div className='flex items-center gap-3'>
                            {calculado.habilitarPago1 && (
                                <div className={`w-6 h-6 rounded border-3 flex items-center justify-center transition-all ${
                                    isVenc1Selected 
                                        ? 'bg-green-500 border-green-400 shadow-lg shadow-green-500/50' 
                                        : 'border-green-400 bg-transparent hover:border-green-300'
                                }`}>
                                    {isVenc1Selected && (
                                        <svg className="w-4 h-4 text-white font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            )}
                            <span className={`text-sm font-semibold ${
                                calculado.estadoPago1 === 'PAGADO'
                                    ? 'text-blue-200'
                                    : 'text-green-200'
                            }`}>
                                1° {factura.CTA1_VTO}
                            </span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <span className={`font-bold text-sm ${
                                calculado.estadoPago1 === 'PAGADO'
                                    ? 'text-blue-100'
                                    : 'text-green-100'
                            }`}>
                                ${calculado.importe1.toLocaleString()}
                            </span>
                            {calculado.estadoPago1 === 'PAGADO' && (
                                <span className='text-blue-200 text-sm'>✅</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Segundo vencimiento (si existe) */}
                {calculado.tieneSegundoVencimiento && (
                    <div
                        className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                            calculado.estadoPago2 === 'PAGADO'
                                ? 'bg-blue-900/30 border-blue-500'
                                : calculado.habilitarPago2
                                ? isVenc2Selected 
                                    ? 'bg-orange-700/60 border-orange-400 shadow-lg shadow-orange-500/30' 
                                    : 'bg-orange-900/30 hover:bg-orange-800/50 border-orange-700'
                                : 'bg-gray-700/30 cursor-not-allowed opacity-60 border-gray-600'
                        }`}
                        onClick={() => calculado.habilitarPago2 && handleVencimientoClick('2')}
                    >
                        <div className='flex justify-between items-center'>
                            <div className='flex items-center gap-3'>
                                {calculado.habilitarPago2 && (
                                    <div className={`w-6 h-6 rounded border-3 flex items-center justify-center transition-all ${
                                        isVenc2Selected 
                                            ? 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/50' 
                                            : 'border-orange-400 bg-transparent hover:border-orange-300'
                                    }`}>
                                        {isVenc2Selected && (
                                            <svg className="w-4 h-4 text-white font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                )}
                                <span className={`text-sm font-semibold ${
                                    calculado.estadoPago2 === 'PAGADO'
                                        ? 'text-blue-200'
                                        : 'text-orange-200'
                                }`}>
                                    2° {factura.CTA2_VTO}
                                </span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <span className={`font-bold text-sm ${
                                    calculado.estadoPago2 === 'PAGADO'
                                        ? 'text-blue-100'
                                        : 'text-orange-100'
                                }`}>
                                    ${calculado.importe2.toLocaleString()}
                                </span>
                                {calculado.estadoPago2 === 'PAGADO' && (
                                    <span className='text-blue-200 text-sm'>✅</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Componente principal con pagos múltiples integrados
export default function TASFacturasGrid({ facturasImpagas, nis }) {
    const [selectedVencimientos, setSelectedVencimientos] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Debug para ver cambios en selectedVencimientos
    useEffect(() => {
        console.log('🔄 selectedVencimientos actualizado:', selectedVencimientos);
    }, [selectedVencimientos]);

    // ✅ MEMOIZAR vencimientos disponibles
    const vencimientosDisponibles = useMemo(() => {
        const vencimientos = [];
        
        if (!facturasImpagas || !Array.isArray(facturasImpagas)) return vencimientos;
        
        facturasImpagas.forEach(factura => {
            const calculado = calcularImportesFactura(factura);
            const nroFactura = factura.NROFACT;
            const estado = factura.ESTADO;

            if (calculado.habilitarPago1) {
                vencimientos.push({
                    id: `${nroFactura}-1`,
                    nroFactura,
                    tipo: '1° Vencimiento',
                    fecha: factura.CTA1_VTO,
                    importe: calculado.importe1,
                    estado: estado,
                    facturaCompleta: factura,
                    priority: 1
                });
            }

            if (calculado.habilitarPago2) {
                vencimientos.push({
                    id: `${nroFactura}-2`,
                    nroFactura,
                    tipo: '2° Vencimiento',
                    fecha: factura.CTA2_VTO,
                    importe: calculado.importe2,
                    estado: estado,
                    facturaCompleta: factura,
                    priority: 2
                });
            }
        });

        console.log('📋 Vencimientos disponibles:', vencimientos);
        return vencimientos;
    }, [facturasImpagas]);

    // ✅ FUNCIÓN para parsear fechas en formato DD/MM/YYYY
    const parsearFecha = useCallback((fechaString) => {
        if (!fechaString) return new Date();
        const partes = fechaString.split('/');
        if (partes.length !== 3) return new Date();
        
        return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    }, []);

    // ✅ VALIDACIÓN de orden cronológico (adaptada de MultiplePaymentSelector)
    const validatePaymentOrder = useCallback((selectedItems, todosVencimientos) => {
        const facturaGroups = {};
        selectedItems.forEach(item => {
            if (!facturaGroups[item.nroFactura]) {
                facturaGroups[item.nroFactura] = [];
            }
            facturaGroups[item.nroFactura].push(item);
        });

        // VALIDAR ORDEN CRONOLÓGICO basado en fechas de vencimiento
        const facturasSeleccionadas = Object.keys(facturaGroups);
        
        if (facturasSeleccionadas.length > 1) {
            const facturasPorVencimiento = new Map();
            
            todosVencimientos.forEach(vencimiento => {
                if (vencimiento.estado === 'IMPAGA' || vencimiento.estado === 'PARCIAL') {
                    const fechaVencimiento = parsearFecha(vencimiento.fecha);
                    
                    if (!facturasPorVencimiento.has(vencimiento.nroFactura)) {
                        facturasPorVencimiento.set(vencimiento.nroFactura, {
                            numero: vencimiento.nroFactura,
                            fechaMasAntigua: fechaVencimiento,
                            fechaOriginal: vencimiento.fecha
                        });
                    } else {
                        const facturaExistente = facturasPorVencimiento.get(vencimiento.nroFactura);
                        if (fechaVencimiento < facturaExistente.fechaMasAntigua) {
                            facturaExistente.fechaMasAntigua = fechaVencimiento;
                            facturaExistente.fechaOriginal = vencimiento.fecha;
                        }
                    }
                }
            });
            
            const facturasOrdenadas = Array.from(facturasPorVencimiento.values())
                .sort((a, b) => a.fechaMasAntigua - b.fechaMasAntigua);
            
            const facturasAnterioresPendientes = [];
            let encontrePrimeraSeleccionada = false;
            
            for (const factura of facturasOrdenadas) {
                if (facturasSeleccionadas.includes(factura.numero)) {
                    encontrePrimeraSeleccionada = true;
                } else if (!encontrePrimeraSeleccionada) {
                    facturasAnterioresPendientes.push(factura.numero);
                }
            }
            
            if (facturasAnterioresPendientes.length > 0) {
                let mensaje = `💡 <b style="font-size: 18px;">Recomendación de orden de pago:</b><br><br>`;
                mensaje += `📅 <b style="font-size: 16px;">Facturas más antiguas pendientes:</b> ${facturasAnterioresPendientes.join(', ')}<br><br>`;
                mensaje += `<span style="font-size: 16px;">Te recomendamos pagar en orden cronológico para mejor organización.</span><br><br>`;
                mensaje += `<span style="font-size: 16px;">¿Continuar con esta selección?</span>`;
                
                return {
                    type: 'warning',
                    message: mensaje,
                    facturasPendientes: facturasAnterioresPendientes
                };
            }
        }

        return null;
    }, [parsearFecha]);

    // ✅ MANEJAR selección de vencimientos - CORREGIDO
    const handleToggleVencimiento = useCallback(async (vencimiento) => {
        console.log('🎯 handleToggleVencimiento llamado con:', vencimiento);
        
        const exists = selectedVencimientos.find(item => item.id === vencimiento.id);
        console.log('🔍 Vencimiento existe?', exists ? 'SÍ' : 'NO');

        if (exists) {
            // Deseleccionar - validar que no quede 2° sin 1°
            console.log('➖ Deseleccionando vencimiento:', vencimiento.id);
            const newSelectionAfterRemove = selectedVencimientos.filter(item => item.id !== vencimiento.id);
            
            if (vencimiento.tipo === '1° Vencimiento') {
                const vencimientosDeEstaFactura = vencimientosDisponibles.filter(v => v.nroFactura === vencimiento.nroFactura);
                const tieneDobleVencimiento = vencimientosDeEstaFactura.length === 2;
                const estadoFactura = vencimientosDeEstaFactura[0]?.estado;
                
                if (estadoFactura === 'IMPAGA' && tieneDobleVencimiento) {
                    const queda2doSeleccionado = newSelectionAfterRemove.some(item => 
                        item.nroFactura === vencimiento.nroFactura && item.tipo === '2° Vencimiento'
                    );
                    
                    if (queda2doSeleccionado) {
                        await Swal.fire({
                            icon: 'error',
                            title: '<span style="font-size: 24px;">No puedes deseleccionar el 1° vencimiento</span>',
                            html: `<span style="font-size: 18px;">Para la factura ${vencimiento.nroFactura}: debes mantener el 1° vencimiento si tienes seleccionado el 2°.</span>`,
                            confirmButtonColor: '#dc2626',
                            confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                            customClass: {
                                popup: 'swal2-large-text'
                            }
                        });
                        return;
                    }
                }
            }
            
            setSelectedVencimientos(newSelectionAfterRemove);
            return;
        }

        // Seleccionar - validar que no se seleccione 2° sin 1°
        console.log('➕ Seleccionando vencimiento:', vencimiento.id);
        const newSelection = [...selectedVencimientos, vencimiento];

        if (vencimiento.tipo === '2° Vencimiento') {
            const vencimientosDeEstaFactura = vencimientosDisponibles.filter(v => v.nroFactura === vencimiento.nroFactura);
            const tieneDobleVencimiento = vencimientosDeEstaFactura.length === 2;
            const estadoFactura = vencimientosDeEstaFactura[0]?.estado;
            
            if (estadoFactura === 'IMPAGA' && tieneDobleVencimiento) {
                const tiene1roSeleccionado = newSelection.some(item => 
                    item.nroFactura === vencimiento.nroFactura && item.tipo === '1° Vencimiento'
                );
                
                if (!tiene1roSeleccionado) {
                    await Swal.fire({
                        icon: 'error',
                        title: '<span style="font-size: 24px;">Orden de pago incorrecto</span>',
                        html: `<span style="font-size: 18px;">Debes seleccionar primero el 1° vencimiento de la factura ${vencimiento.nroFactura}.</span>`,
                        confirmButtonColor: '#dc2626',
                        confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                        customClass: {
                            popup: 'swal2-large-text'
                        }
                    });
                    return;
                }
            }
        }

        // Validar orden cronológico entre facturas
        const validationResult = validatePaymentOrder(newSelection, vencimientosDisponibles);
        
        if (validationResult?.type === 'warning') {
            const result = await Swal.fire({
                icon: 'warning',
                title: '<span style="font-size: 24px;">Orden de pago recomendado</span>',
                html: validationResult.message,
                showCancelButton: true,
                confirmButtonText: '<span style="font-size: 16px;">Continuar</span>',
                cancelButtonText: '<span style="font-size: 16px;">Cancelar</span>',
                confirmButtonColor: '#059669',
                cancelButtonColor: '#6b7280',
                customClass: {
                    popup: 'swal2-large-text'
                }
            });
            
            if (result.isConfirmed) {
                setSelectedVencimientos(newSelection);
            }
        } else {
            setSelectedVencimientos(newSelection);
        }
    }, [selectedVencimientos, validatePaymentOrder, vencimientosDisponibles]);

    // ✅ FUNCIÓN PARA CALCULAR TOTAL - MOVER ANTES DE SU USO
    const getTotalAmount = useCallback(() => {
        return selectedVencimientos.reduce((sum, item) => sum + parseFloat(item.importe || 0), 0);
    }, [selectedVencimientos]);

    // ✅ PROCESAR PAGO - LÓGICA COMPLETA DE MultiplePaymentSelector.js
    const handleProcesarPago = async () => {
        if (selectedVencimientos.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: '<span style="font-size: 24px;">Selecciona vencimientos</span>',
                html: '<span style="font-size: 18px;">Debes seleccionar al menos un vencimiento para continuar.</span>',
                confirmButtonColor: '#059669',
                confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                customClass: {
                    popup: 'swal2-large-text'
                }
            });
            return;
        }

        if (selectedVencimientos.length === 1) {
            // Pago individual - usar función original
            const vencimiento = selectedVencimientos[0];
            await processPayment(vencimiento.paymentData, nis);
            return;
        }

        // ✅ MOSTRAR MODAL DE SELECCIÓN PARA PAGOS MÚLTIPLES
        const metodoPago = await showPaymentMethodSelector();
        if (!metodoPago) {
            setIsProcessing(false);
            return;
        }

        // ✅ PAGO MÚLTIPLE - Lógica completa de MultiplePaymentSelector.js
        setIsProcessing(true);
        
        try {
            // Preparar items en formato requerido por la API múltiple
            const items = selectedVencimientos.map(v => ({
                id: v.id,
                nis: nis,
                factura: v.nroFactura,
                vencimiento: v.fecha,
                amount: v.importe,
                tipo: v.tipo,
                descripcion: `Factura ${v.nroFactura} - ${v.tipo}`
            }));

            console.log('📤 Enviando items para pago múltiple:', items);

            // Seleccionar endpoint según método elegido
            const url = metodoPago === 'mercadopago' 
                ? `${process.env.NEXT_PUBLIC_API_URL}/api/payment-multiple`
                : `${process.env.NEXT_PUBLIC_API_URL}/api/modo/payment-multiple`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: items
                }),
            });

            const result = await response.json();

            if (metodoPago === 'mercadopago') {
                // MercadoPago - Mostrar QR (TAS usa QR, no redirección)
                if (!result.qr) {
                    throw new Error('El QR de MercadoPago no fue generado correctamente.');
                }

                // Mostrar QR de MercadoPago con total correcto
                Swal.fire({
                    html: `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <p style="margin-bottom: 20px; font-weight: bold; color: #374151; font-size: 24px;">Escaneá con tu app MercadoPago</p>
                            <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(result.qr)}&size=320x320" 
                                alt="QR MercadoPago" 
                                style="display: block; margin: 0 auto; border-radius: 12px; border: 3px solid #f3f4f6;" 
                            />
                            <p style="margin-top:20px; font-size:16px; text-align:center; color: #6b7280;">
                                <b>ID de transacción:</b><br>
                                <code style="background: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px;">${result.externalIntentionId || result.transactionId}</code>
                            </p>
                            <div style="margin-top:20px; padding: 15px 25px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 10px; color: white; text-align: center;">
                                <div style="font-size: 16px; opacity: 0.9;">Total a pagar</div>
                                <div style="font-size: 28px; font-weight: bold;">${getTotalAmount().toLocaleString()}</div>
                                <div style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${selectedVencimientos.length} vencimientos seleccionados</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'rounded-2xl shadow-2xl'
                    },
                    didOpen: () => {
                        startMultiplePaymentPolling(result.externalIntentionId || result.transactionId);
                    }
                });
            } else {
                // MODO - Mostrar QR
                if (!result.qr) {
                    throw new Error('El QR de MODO no fue generado correctamente.');
                }

                // Mostrar QR con total correcto
                Swal.fire({
                    html: `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <p style="margin-bottom: 20px; font-weight: bold; color: #374151; font-size: 24px;">Escaneá con tu app MODO</p>
                            <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(result.qr)}&size=320x320" 
                                alt="QR MODO" 
                                style="display: block; margin: 0 auto; border-radius: 12px; border: 3px solid #f3f4f6;" 
                            />
                            <p style="margin-top:20px; font-size:16px; text-align:center; color: #6b7280;">
                                <b>ID de transacción:</b><br>
                                <code style="background: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px;">${result.externalIntentionId}</code>
                            </p>
                            <div style="margin-top:20px; padding: 15px 25px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 10px; color: white; text-align: center;">
                                <div style="font-size: 16px; opacity: 0.9;">Total a pagar</div>
                                <div style="font-size: 28px; font-weight: bold;">$${getTotalAmount().toLocaleString()}</div>
                                <div style="font-size: 14px; opacity: 0.8; margin-top: 4px;">${selectedVencimientos.length} vencimientos seleccionados</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'rounded-2xl shadow-2xl'
                    },
                    didOpen: () => {
                        startMultiplePaymentPolling(result.externalIntentionId);
                    }
                });
            }

        } catch (error) {
            console.error('Error:', error);
            await Swal.fire({
                icon: 'error',
                title: '<span style="font-size: 24px;">Error</span>',
                html: `<span style="font-size: 18px;">Error al procesar el pago múltiple: ${error.message}</span>`,
                confirmButtonColor: '#dc2626',
                confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                customClass: {
                    popup: 'swal2-large-text'
                }
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // ✅ POLLING MÚLTIPLE - Adaptado de MultiplePaymentSelector.js
    const startMultiplePaymentPolling = useCallback((externalId) => {
        let pollingInterval = null;
        let pollingTimeout = null;
        let alertaMostrada = false;

        const checkStatus = async () => {
            try {
                let algunPagoExitoso = false;
                
                for (const item of selectedVencimientos) {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/modo/payment-status?factura=${item.nroFactura}&nis=${nis}`
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        const estado = data.status;
                        const paymentId = data.payment_id;

                        if (estado === 'approved' && paymentId && paymentId.includes(externalId)) {
                            algunPagoExitoso = true;
                        } else if (estado === 'rejected') {
                            clearInterval(pollingInterval);
                            clearTimeout(pollingTimeout);
                            alertaMostrada = true;

                            await Swal.fire({
                                icon: 'error',
                                title: '<span style="font-size: 24px;">Pago Múltiple Rechazado</span>',
                                html: '<span style="font-size: 18px;">Tu pago múltiple fue rechazado. Por favor, intentá nuevamente.</span>',
                                confirmButtonColor: '#DC2626',
                                confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                                customClass: {
                                    popup: 'swal2-large-text'
                                }
                            });
                            return;
                        }
                    }
                }

                if (alertaMostrada) return;

                if (algunPagoExitoso) {
                    clearInterval(pollingInterval);
                    clearTimeout(pollingTimeout);
                    alertaMostrada = true;

                    await Swal.fire({
                        icon: 'success',
                        title: '<span style="font-size: 24px;">Pago Múltiple Exitoso 🎫</span>',
                        html: `
                            <div style="text-align: center;">
                                <p style="margin-bottom: 20px; color: #374151; font-size: 18px;">Tu pago de <b style="color: #059669; font-size: 20px;">${getTotalAmount().toLocaleString()}</b> ha sido procesado correctamente.</p>
                                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; margin: 15px 0;">
                                    <p style="margin: 0; font-size: 16px; color: #166534;">✅ Se actualizaron ${selectedVencimientos.length} vencimientos</p>
                                    <p style="margin: 5px 0 0 0; font-size: 16px; color: #166534;">🖨️ Imprimiendo comprobante automáticamente...</p>
                                </div>
                            </div>
                        `,
                        confirmButtonText: '<span style="font-size: 16px;">Ver mi cuenta</span>',
                        confirmButtonColor: '#059669',
                        allowOutsideClick: false,
                        customClass: {
                            popup: 'swal2-large-text'
                        }
                    });

                    // Recargar la página para actualizar el estado
                    window.location.reload();
                }

            } catch (error) {
                console.error('Error durante polling múltiple:', error);
            }
        };

        checkStatus();
        pollingInterval = setInterval(checkStatus, 3000);
        pollingTimeout = setTimeout(() => {
            clearInterval(pollingInterval);
            if (!alertaMostrada) {
                alertaMostrada = true;
                Swal.fire({
                    icon: 'warning',
                    title: '<span style="font-size: 24px;">Sin respuesta de MODO</span>',
                    html: '<span style="font-size: 18px;">No se pudo confirmar el pago en el tiempo esperado.</span>',
                    confirmButtonColor: '#F59E0B',
                    confirmButtonText: '<span style="font-size: 16px;">Entendido</span>',
                    customClass: {
                        popup: 'swal2-large-text'
                    }
                });
            }
        }, 120000);
    }, [selectedVencimientos, nis, getTotalAmount]);

    if (!facturasImpagas.length) {
        return (
            <div className='bg-green-800/30 p-6 rounded-xl text-center h-full flex items-center justify-center'>
                <p className='text-2xl text-green-200 font-semibold'>
                    ✅ No tienes facturas pendientes
                </p>
            </div>
        );
    }

    return (
        <div className='bg-green-800/30 p-3 rounded-lg flex-1 flex flex-col min-h-0'>
            {/* HEADER CON RESUMEN - FUENTES GRANDES */}
            <div className='flex justify-between items-center mb-3'>
                <h3 className='text-xl font-bold text-lime-200'>
                    FACTURAS PENDIENTES ({facturasImpagas.length})
                </h3>
                
                {selectedVencimientos.length > 0 && (
                    <div className='text-right bg-green-700/40 px-4 py-2 rounded-lg border border-green-500'>
                        <div className='text-sm text-green-200 font-semibold'>
                            {selectedVencimientos.length} seleccionados
                        </div>
                        <div className='text-lg font-bold text-green-100'>
                            ${getTotalAmount().toLocaleString()}
                        </div>
                    </div>
                )}
            </div>

            {/* GRILLA SIN SCROLL - ALTURA FIJA */}
            <div className='flex-1 min-h-0'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 h-full'>
                    {facturasImpagas.map((factura, index) => (
                        <FacturaCard
                            key={`factura-${factura.NROFACT}-${index}`}
                            factura={factura}
                            nis={nis}
                            selectedVencimientos={selectedVencimientos}
                            onToggleVencimiento={handleToggleVencimiento}
                        />
                    ))}
                </div>
            </div>

            {/* BOTÓN DE PAGO FIJO EN PARTE INFERIOR - FUENTE GRANDE */}
            {selectedVencimientos.length > 0 && (
                <div className='mt-3 pt-3 border-t-2 border-green-600'>
                    <button
                        onClick={handleProcesarPago}
                        disabled={isProcessing}
                        className={`w-full py-4 rounded-lg text-white font-bold text-xl transition-all shadow-lg ${
                            isProcessing
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-500 active:scale-95 hover:shadow-xl'
                        }`}
                    >
                        {isProcessing ? (
                            <div className='flex items-center justify-center gap-3'>
                                <div className='animate-spin rounded-full h-6 w-6 border-b-3 border-white'></div>
                                <span className='text-lg'>Procesando...</span>
                            </div>
                        ) : (
                            `💳 PAGAR ${selectedVencimientos.length > 1 ? 'SELECCIONADOS' : 'VENCIMIENTO'} - ${getTotalAmount().toLocaleString()}`
                        )}
                    </button>
                </div>
            )}

            {/* ESTILOS PARA SWEETALERT CON FUENTES GRANDES */}
            <style jsx global>{`
                .swal2-large-text .swal2-html-container {
                    font-size: 18px !important;
                    line-height: 1.5 !important;
                }
                .swal2-large-text .swal2-title {
                    font-size: 28px !important;
                }
                .swal2-large-text .swal2-confirm {
                    font-size: 16px !important;
                    padding: 12px 24px !important;
                }
                .swal2-large-text .swal2-cancel {
                    font-size: 16px !important;
                    padding: 12px 24px !important;
                }
            `}</style>
        </div>
    );
}