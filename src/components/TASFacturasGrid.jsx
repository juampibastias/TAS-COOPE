// TASFacturasGrid.jsx - Diseño Profesional para Pagos Múltiples
import { useState, useCallback, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { processPayment } from '../services/paymentService';
import { imprimirTicketMultiple } from '../services/multiplePaymentPrintService';

// ✅ FUNCIÓN PARA CALCULAR IMPORTES (copiada exacta del MultiplePaymentSelector)
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
        habilitarPago2 = false;
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

// ✅ COMPONENTE INDIVIDUAL DE VENCIMIENTO SELECCIONABLE
function VencimientoSeleccionable({ 
    vencimiento, 
    isSelected, 
    onToggle, 
    isDisabled = false 
}) {
    const handleClick = () => {
        if (!isDisabled) {
            onToggle(vencimiento);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            className={`w-full p-6 rounded-2xl border-4 transition-all duration-300 text-left active:scale-95 ${
                isDisabled
                    ? 'bg-gray-300 border-gray-400 opacity-60 cursor-not-allowed'
                    : isSelected
                        ? 'bg-yellow-500 border-yellow-300 text-black shadow-2xl scale-105'
                        : 'bg-green-700 border-green-500 hover:bg-green-600 cursor-pointer text-white'
            }`}
            style={{ 
                minHeight: '120px',
                touchAction: 'manipulation' // Optimización para touch
            }}
        >
            <div className="flex justify-between items-center h-full">
                {/* Información del vencimiento */}
                <div className="flex-1">
                    <div className={`text-2xl font-black mb-2 ${
                        isDisabled 
                            ? 'text-gray-600' 
                            : isSelected 
                                ? 'text-black' 
                                : 'text-white'
                    }`}>
                        FACTURA {vencimiento.nroFactura}
                    </div>
                    <div className={`text-xl font-bold mb-1 ${
                        isDisabled 
                            ? 'text-gray-500' 
                            : isSelected 
                                ? 'text-black' 
                                : 'text-green-100'
                    }`}>
                        {vencimiento.tipo}
                    </div>
                    <div className={`text-lg ${
                        isDisabled 
                            ? 'text-gray-500' 
                            : isSelected 
                                ? 'text-black' 
                                : 'text-green-200'
                    }`}>
                        Vence: {vencimiento.fecha}
                    </div>
                </div>

                {/* Precio y estado */}
                <div className="text-right">
                    <div className={`text-3xl font-black mb-2 ${
                        isDisabled 
                            ? 'text-gray-600' 
                            : isSelected 
                                ? 'text-black' 
                                : 'text-white'
                    }`}>
                        ${vencimiento.importe.toLocaleString('es-AR')}
                    </div>
                    <div className={`text-lg font-bold ${
                        isDisabled 
                            ? 'text-gray-500' 
                            : isSelected 
                                ? 'text-black' 
                                : 'text-green-200'
                    }`}>
                        {isDisabled 
                            ? (vencimiento.estadoPago === 'PAGADO' ? '✅ PAGADO' : '🚫 NO DISPONIBLE')
                            : isSelected 
                                ? '☑️ SELECCIONADO' 
                                : '👆 TOCAR PARA SELECCIONAR'
                        }
                    </div>
                </div>
            </div>
        </button>
    );
}

// ✅ BOTÓN TOTALIZADOR FLOTANTE
function TotalizadorFlotante({ selectedVencimientos, onPagar, isProcessing }) {
    if (selectedVencimientos.length === 0) return null;

    const total = selectedVencimientos.reduce((sum, v) => sum + parseFloat(v.amount), 0);

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md">
            <div className="bg-green-600 border-4 border-green-300 rounded-2xl p-6 shadow-2xl">
                <div className="text-center text-white mb-4">
                    <div className="text-xl font-bold mb-2">
                        {selectedVencimientos.length} VENCIMIENTOS SELECCIONADOS
                    </div>
                    <div className="text-4xl font-black">
                        TOTAL: ${total.toLocaleString('es-AR')}
                    </div>
                </div>
                <button
                    onClick={onPagar}
                    disabled={isProcessing}
                    className={`w-full py-6 px-8 rounded-2xl text-3xl font-black text-white border-4 transition-all duration-300 ${
                        isProcessing
                            ? 'bg-gray-600 border-gray-400 cursor-not-allowed opacity-50'
                            : 'bg-yellow-600 border-yellow-300 hover:bg-yellow-500 active:scale-95 shadow-lg hover:shadow-xl'
                    }`}
                    style={{ 
                        minHeight: '80px',
                        touchAction: 'manipulation'
                    }}
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-white"></div>
                            PROCESANDO...
                        </div>
                    ) : (
                        '💳 PAGAR SELECCIONADOS'
                    )}
                </button>
            </div>
        </div>
    );
}

// ✅ COMPONENTE PRINCIPAL
export default function TASFacturasGrid({ facturasImpagas, nis }) {
    const [selectedVencimientos, setSelectedVencimientos] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasShownOrderWarning, setHasShownOrderWarning] = useState(false);

    // ✅ GENERAR VENCIMIENTOS DISPONIBLES (lógica copiada exacta)
    const vencimientosDisponibles = useMemo(() => {
        const vencimientos = [];
        
        if (!facturasImpagas || !Array.isArray(facturasImpagas)) return vencimientos;
        
        facturasImpagas.forEach(factura => {
            if (!factura || typeof factura !== 'object') return;
            
            const nroFactura = factura.NROFACT || factura.nrofact || factura.numero || 'SIN_NUMERO';
            const estado = factura.ESTADO || factura.estado || factura.status || '';
            const cta1Imp = parseFloat(factura.CTA1_IMP || factura.cta1_imp || factura.importe1 || 0);
            const cta2Imp = parseFloat(factura.CTA2_IMP || factura.cta2_imp || factura.importe2 || 0);
            const cta1Vto = factura.CTA1_VTO || factura.cta1_vto || factura.vencimiento1 || '';
            const cta2Vto = factura.CTA2_VTO || factura.cta2_vto || factura.vencimiento2 || '';

            const calculado = calcularImportesFactura(factura);

            // Primer vencimiento
            if (estado === 'IMPAGA' && cta1Imp > 0) {
                vencimientos.push({
                    id: `${nroFactura}-1`,
                    nroFactura,
                    tipo: '1° VENCIMIENTO',
                    tipoCorto: '1°',
                    fecha: cta1Vto,
                    importe: cta1Imp,
                    estado: estado,
                    facturaCompleta: factura,
                    priority: 1,
                    estadoPago: calculado.estadoPago1,
                    habilitado: calculado.habilitarPago1
                });
            }

            // Segundo vencimiento
            if ((estado === 'IMPAGA' || estado === 'PARCIAL') && cta2Imp > 0) {
                vencimientos.push({
                    id: `${nroFactura}-2`,
                    nroFactura,
                    tipo: '2° VENCIMIENTO',
                    tipoCorto: '2°',
                    fecha: cta2Vto,
                    importe: cta2Imp,
                    estado: estado,
                    facturaCompleta: factura,
                    priority: 2,
                    estadoPago: calculado.estadoPago2,
                    habilitado: calculado.habilitarPago2
                });
            }
        });

        // Ordenar por fecha de vencimiento
        return vencimientos.sort((a, b) => {
            const fechaA = parsearFecha(a.fecha);
            const fechaB = parsearFecha(b.fecha);
            return fechaA - fechaB;
        });
    }, [facturasImpagas]);

    // ✅ FUNCIÓN PARA PARSEAR FECHAS
    const parsearFecha = useCallback((fechaString) => {
        if (!fechaString) return new Date();
        const partes = fechaString.split('/');
        if (partes.length !== 3) return new Date();
        
        return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
    }, []);

    // ✅ VALIDACIÓN DE ORDEN DE PAGO (lógica copiada exacta)
    const validatePaymentOrder = useCallback((selectedItems, todosVencimientos) => {
        if (hasShownOrderWarning) {
            return null;
        }

        const facturaGroups = {};
        selectedItems.forEach(item => {
            if (!facturaGroups[item.factura]) {
                facturaGroups[item.factura] = [];
            }
            facturaGroups[item.factura].push(item);
        });

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
            
            const facturasIntermedias = [];
            let primeraSeleccionadaIndex = -1;
            let ultimaSeleccionadaIndex = -1;
            
            facturasOrdenadas.forEach((factura, index) => {
                if (facturasSeleccionadas.includes(factura.numero)) {
                    if (primeraSeleccionadaIndex === -1) primeraSeleccionadaIndex = index;
                    ultimaSeleccionadaIndex = index;
                }
            });
            
            for (let i = primeraSeleccionadaIndex + 1; i < ultimaSeleccionadaIndex; i++) {
                const factura = facturasOrdenadas[i];
                if (!facturasSeleccionadas.includes(factura.numero)) {
                    facturasIntermedias.push(factura.numero);
                }
            }
            
            if (facturasAnterioresPendientes.length > 0 || facturasIntermedias.length > 0) {
                let facturasPendientes = [...facturasAnterioresPendientes, ...facturasIntermedias];
                
                let mensaje = `💡 <b>Recomendación de orden de pago:</b><br><br>`;
                mensaje += `📅 <b>Facturas más antiguas pendientes:</b> ${facturasPendientes.join(', ')}<br><br>`;
                mensaje += `Te recomendamos pagar en orden cronológico para mejor organización.<br><br>`;
                mensaje += `¿Continuar con esta selección?`;
                
                return {
                    type: 'warning',
                    message: mensaje,
                    facturasPendientes: facturasPendientes
                };
            }
        }

        return null;
    }, [parsearFecha, hasShownOrderWarning]);

    // ✅ MANEJAR SELECCIÓN DE VENCIMIENTO
    const handleVencimientoToggle = useCallback(async (vencimiento) => {
        const exists = selectedVencimientos.find(item => item.id === vencimiento.id);

        if (exists) {
            // Deseleccionar
            const newSelectionAfterRemove = selectedVencimientos.filter(item => item.id !== vencimiento.id);
            
            // Validar que no se deseleccione 1er vencimiento si 2do está seleccionado
            if (vencimiento.tipo === '1° VENCIMIENTO') {
                const vencimientosDeEstaFactura = vencimientosDisponibles.filter(v => v.nroFactura === vencimiento.nroFactura);
                const tieneDobleVencimiento = vencimientosDeEstaFactura.length === 2;
                const estadoFactura = vencimientosDeEstaFactura[0]?.estado;
                
                if (estadoFactura === 'IMPAGA' && tieneDobleVencimiento) {
                    const queda2doSeleccionado = newSelectionAfterRemove.some(item => 
                        item.factura === vencimiento.nroFactura && item.tipo === '2° VENCIMIENTO'
                    );
                    
                    if (queda2doSeleccionado) {
                        Swal.fire({
                            icon: 'error',
                            title: 'No puedes deseleccionar el 1° vencimiento',
                            html: `<div style="font-size: 20px; padding: 20px;">Para la factura <b>${vencimiento.nroFactura}</b>:<br><br>Debes mantener el 1° vencimiento si tienes seleccionado el 2°.</div>`,
                            confirmButtonText: 'ENTENDIDO',
                            confirmButtonColor: '#dc2626',
                            customClass: {
                                popup: 'rounded-xl shadow-2xl',
                                confirmButton: 'rounded-lg text-xl py-3 px-6'
                            }
                        });
                        return;
                    }
                }
            }
            
            setSelectedVencimientos(newSelectionAfterRemove);
            return;
        }

        // Seleccionar - crear nuevo item
        const newSelection = [...selectedVencimientos, {
            id: vencimiento.id,
            nis: nis,
            factura: vencimiento.nroFactura,
            vencimiento: vencimiento.fecha,
            amount: vencimiento.importe,
            tipo: vencimiento.tipo,
            descripcion: `Factura ${vencimiento.nroFactura} - ${vencimiento.tipo}`
        }];

        // Validar orden de vencimiento dentro de la misma factura
        if (vencimiento.tipo === '2° VENCIMIENTO') {
            const vencimientosDeEstaFactura = vencimientosDisponibles.filter(v => v.nroFactura === vencimiento.nroFactura);
            const tieneDobleVencimiento = vencimientosDeEstaFactura.length === 2;
            const estadoFactura = vencimientosDeEstaFactura[0]?.estado;
            
            if (estadoFactura === 'IMPAGA' && tieneDobleVencimiento) {
                const tiene1roSeleccionado = newSelection.some(item => 
                    item.factura === vencimiento.nroFactura && item.tipo === '1° VENCIMIENTO'
                );
                
                if (!tiene1roSeleccionado) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Orden de pago incorrecto',
                        html: `<div style="font-size: 20px; padding: 20px;">Debes seleccionar primero el <b>1° vencimiento</b> de la factura <b>${vencimiento.nroFactura}</b>.</div>`,
                        confirmButtonText: 'ENTENDIDO',
                        confirmButtonColor: '#dc2626',
                        customClass: {
                            popup: 'rounded-xl shadow-2xl',
                            confirmButton: 'rounded-lg text-xl py-3 px-6'
                        }
                    });
                    return;
                }
            }
        }

        // Validar orden cronológico entre facturas
        const validationResult = validatePaymentOrder(newSelection, vencimientosDisponibles);
        
        if (validationResult?.type === 'error') {
            Swal.fire({
                icon: 'error',
                title: 'Orden de pago incorrecto',
                html: `<div style="font-size: 18px; padding: 20px;">${validationResult.message}</div>`,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: '#dc2626',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    confirmButton: 'rounded-lg text-xl py-3 px-6'
                }
            });
        } else if (validationResult?.type === 'warning') {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Orden de pago recomendado',
                html: `<div style="font-size: 18px; padding: 20px;">${validationResult.message}</div>`,
                showCancelButton: true,
                confirmButtonText: 'CONTINUAR',
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: '#059669',
                cancelButtonColor: '#6b7280',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    confirmButton: 'rounded-lg text-xl py-3 px-6',
                    cancelButton: 'rounded-lg text-xl py-3 px-6'
                }
            });
            
            setHasShownOrderWarning(true);
            
            if (result.isConfirmed) {
                setSelectedVencimientos(newSelection);
            }
        } else {
            setSelectedVencimientos(newSelection);
        }
    }, [selectedVencimientos, nis, validatePaymentOrder, vencimientosDisponibles]);

    // ✅ PROCESAR PAGO MÚLTIPLE
    const handlePagar = useCallback(async () => {
        if (selectedVencimientos.length === 0) return;

        const total = selectedVencimientos.reduce((sum, v) => sum + parseFloat(v.amount || 0), 0);

        // Confirmación
        const confirmResult = await Swal.fire({
            icon: 'question',
            title: 'Confirmar pagos',
            html: `
                <div style="text-align: center; padding: 30px; font-size: 20px;">
                    <p style="font-size: 28px; margin-bottom: 30px;">¿Confirma el pago de <b>${selectedVencimientos.length}</b> vencimientos?</p>
                    <p style="font-size: 42px; font-weight: bold; color: #059669; margin-bottom: 30px;">
                        TOTAL: $${total.toLocaleString('es-AR')}
                    </p>
                    <div style="font-size: 22px; color: #6b7280;">
                        ${selectedVencimientos.map(v => `Factura ${v.factura} (${v.tipo})`).join('<br>')}
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'SÍ, PAGAR',
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#dc2626',
            customClass: {
                popup: 'rounded-xl shadow-2xl',
                confirmButton: 'text-2xl font-bold py-4 px-8 rounded-lg',
                cancelButton: 'text-2xl font-bold py-4 px-8 rounded-lg'
            }
        });

        if (!confirmResult.isConfirmed) return;

        setIsProcessing(true);

        // Mostrar progreso
        Swal.fire({
            title: 'Procesando pagos...',
            html: `
                <div style="text-align: center; padding: 30px; font-size: 20px;">
                    <div style="font-size: 28px; margin-bottom: 30px;">Procesando <b>${selectedVencimientos.length}</b> vencimientos</div>
                    <div style="font-size: 22px; color: #6b7280;">Por favor espere...</div>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            customClass: {
                popup: 'rounded-xl shadow-2xl'
            },
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const results = [];
            
            // Procesar cada vencimiento secuencialmente
            for (const vencimiento of selectedVencimientos) {
                try {
                    const paymentData = {
                        factura: vencimiento.factura,
                        vencimiento: vencimiento.tipo === '1° VENCIMIENTO' ? '1' : '2',
                        fecha: vencimiento.vencimiento,
                        importe: vencimiento.amount.toString(),
                    };

                    console.log(`Procesando pago: Factura ${vencimiento.factura}, Vencimiento ${paymentData.vencimiento}`);
                    
                    await processPayment(paymentData, nis);
                    results.push({ 
                        success: true, 
                        factura: vencimiento.factura, 
                        vencimiento: paymentData.vencimiento,
                        importe: vencimiento.amount,
                        transactionId: `PAY_${Date.now()}_${vencimiento.factura}_${paymentData.vencimiento}`
                    });
                    
                } catch (error) {
                    console.error(`Error procesando factura ${vencimiento.factura}:`, error);
                    results.push({ 
                        success: false, 
                        factura: vencimiento.factura, 
                        vencimiento: vencimiento.tipo === '1° VENCIMIENTO' ? '1' : '2',
                        error: error.message 
                    });
                }
            }

            const exitosos = results.filter(r => r.success);
            const fallidos = results.filter(r => !r.success);

            if (exitosos.length === selectedVencimientos.length) {
                // ✅ IMPRIMIR TICKET MÚLTIPLE
                if (exitosos.length > 1) {
                    const cliente = { NOMBRE: 'Cliente' }; // Aquí puedes obtener el cliente real
                    await imprimirTicketMultiple(exitosos, nis, cliente);
                }

                // Todos exitosos
                Swal.fire({
                    icon: 'success',
                    title: '¡Pagos realizados exitosamente!',
                    html: `
                        <div style="text-align: center; padding: 40px; font-size: 20px;">
                            <p style="font-size: 32px; margin-bottom: 30px; color: #059669; font-weight: bold;">
                                Todos los pagos fueron procesados
                            </p>
                            <p style="font-size: 28px; margin-bottom: 30px;">
                                Total pagado: <strong>$${total.toLocaleString('es-AR')}</strong>
                            </p>
                            <p style="font-size: 24px; color: #6b7280;">
                                ${exitosos.length} vencimientos procesados correctamente
                            </p>
                            <p style="font-size: 22px; color: #059669; margin-top: 20px;">
                                🖨️ Ticket impreso automáticamente
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'CONTINUAR',
                    confirmButtonColor: '#059669',
                    allowOutsideClick: false,
                    customClass: {
                        popup: 'rounded-xl shadow-2xl',
                        confirmButton: 'text-2xl font-bold py-4 px-8 rounded-lg'
                    }
                }).then(() => {
                    window.location.reload();
                });
            } else if (exitosos.length > 0) {
                // Algunos exitosos
                Swal.fire({
                    icon: 'warning',
                    title: 'Pagos procesados parcialmente',
                    html: `
                        <div style="text-align: center; padding: 40px; font-size: 20px;">
                            <p style="font-size: 28px; color: #059669; margin-bottom: 15px;">
                                ✅ Procesados exitosamente: <b>${exitosos.length}</b>
                            </p>
                            <p style="font-size: 28px; color: #dc2626; margin-bottom: 30px;">
                                ❌ Con errores: <b>${fallidos.length}</b>
                            </p>
                            <p style="font-size: 22px; color: #6b7280;">
                                Algunos vencimientos no se pudieron procesar
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'ENTENDIDO',
                    confirmButtonColor: '#059669',
                    customClass: {
                        popup: 'rounded-xl shadow-2xl',
                        confirmButton: 'text-2xl font-bold py-4 px-8 rounded-lg'
                    }
                }).then(() => {
                    window.location.reload();
                });
            } else {
                // Todos fallidos
                Swal.fire({
                    icon: 'error',
                    title: 'Error en los pagos',
                    html: `
                        <div style="text-align: center; padding: 40px; font-size: 20px;">
                            <p style="font-size: 28px; margin-bottom: 30px;">
                                No se pudo procesar ningún pago
                            </p>
                            <p style="font-size: 22px; color: #6b7280;">
                                Por favor intente nuevamente o contacte soporte
                            </p>
                        </div>
                    `,
                    confirmButtonText: 'INTENTAR NUEVAMENTE',
                    confirmButtonColor: '#dc2626',
                    customClass: {
                        popup: 'rounded-xl shadow-2xl',
                        confirmButton: 'text-2xl font-bold py-4 px-8 rounded-lg'
                    }
                });
            }

        } catch (error) {
            console.error('Error general en el procesamiento:', error);
            
            Swal.fire({
                icon: 'error',
                title: 'Error del sistema',
                html: `
                    <div style="text-align: center; padding: 40px; font-size: 20px;">
                        <p style="font-size: 28px; margin-bottom: 30px;">
                            Error inesperado del sistema
                        </p>
                        <p style="font-size: 22px; color: #6b7280;">
                            ${error.message || 'Error desconocido'}
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO',
                confirmButtonColor: '#dc2626',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    confirmButton: 'text-2xl font-bold py-4 px-8 rounded-lg'
                }
            });
        } finally {
            setIsProcessing(false);
        }
    }, [selectedVencimientos, nis]);

    // ✅ RENDER PRINCIPAL
    if (!vencimientosDisponibles || vencimientosDisponibles.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto p-6">
                <div className="text-center py-20">
                    <div className="text-6xl mb-6">✅</div>
                    <div className="text-4xl font-bold text-green-600 mb-4">
                        ¡No hay vencimientos pendientes!
                    </div>
                    <div className="text-2xl text-gray-600">
                        Todas las facturas están al día
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            {/* Header informativo */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-black text-gray-800 mb-4">
                    SELECCIONAR VENCIMIENTOS A PAGAR
                </h1>
                <div className="text-2xl text-gray-600">
                    NIS: <span className="font-bold text-gray-800">{nis}</span>
                </div>
                <div className="text-xl text-gray-500 mt-2">
                    👆 Toque los vencimientos que desea pagar
                </div>
            </div>

            {/* Lista de vencimientos */}
            <div className="space-y-4 mb-32">
                {vencimientosDisponibles.map(vencimiento => (
                    <VencimientoSeleccionable
                        key={vencimiento.id}
                        vencimiento={vencimiento}
                        isSelected={selectedVencimientos.some(item => item.id === vencimiento.id)}
                        onToggle={handleVencimientoToggle}
                        isDisabled={!vencimiento.habilitado}
                    />
                ))}
            </div>

            {/* Totalizador flotante */}
            <TotalizadorFlotante
                selectedVencimientos={selectedVencimientos}
                onPagar={handlePagar}
                isProcessing={isProcessing}
            />
        </div>
    );
}