import { useState, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import { imprimirTicketPagoMultiple } from '../services/multiplePaymentPrintService';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
const metodoModoHabilitado = process.env.NEXT_PUBLIC_MODO_ENABLED === 'true';
const metodoMPHabilitado = process.env.NEXT_PUBLIC_MERCADOPAGO_ENABLED === 'true';

// ✅ FUNCIONES REUTILIZADAS DEL MultiplePaymentSelector
const parsearFecha = (fechaString) => {
    if (!fechaString) return new Date();
    const partes = fechaString.split('/');
    if (partes.length !== 3) return new Date();
    return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
};

const validatePaymentOrder = (selectedItems, todosVencimientos, hasShownOrderWarning = false) => {
    if (hasShownOrderWarning) return null;

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
        
        if (facturasAnterioresPendientes.length > 0) {
            let mensaje = `💡 <b>Recomendación de orden de pago:</b><br><br>`;
            mensaje += `📅 <b>Facturas más antiguas pendientes:</b> ${facturasAnterioresPendientes.join(', ')}<br><br>`;
            mensaje += `Te recomendamos pagar en orden cronológico para mejor organización.<br><br>`;
            mensaje += `¿Continuar con esta selección?`;
            
            return {
                type: 'warning',
                message: mensaje,
                facturasPendientes: facturasAnterioresPendientes
            };
        }
    }

    return null;
};

// ✅ FUNCIÓN CORREGIDA PARA CALCULAR VENCIMIENTOS - SOLO DISPONIBLES
function calcularVencimientosFactura(factura) {
    const estado = factura.ESTADO;
    const cta1Imp = parseFloat(factura.CTA1_IMP || 0);
    const cta2Imp = parseFloat(factura.CTA2_IMP || 0);

    const vencimientos = [];

    // ✅ PRIMER VENCIMIENTO - Solo si importe > 0
    if (cta1Imp > 0) {
        let estadoVenc1 = 'no-disponible';
        
        if (estado === 'IMPAGA') {
            estadoVenc1 = 'disponible';
        } else if (estado === 'PARCIAL') {
            estadoVenc1 = 'pagado';
        } else if (estado === 'PAGADA') {
            estadoVenc1 = 'pagado';
        }

        vencimientos.push({
            id: `${factura.NROFACT}-1`,
            nroFactura: factura.NROFACT,
            tipo: '1',
            fecha: factura.CTA1_VTO,
            importe: cta1Imp,
            estado: estadoVenc1,
            vencimiento: '1',
            priority: 1
        });
    }

    // ✅ SEGUNDO VENCIMIENTO - Solo si importe > 0 Y tiene fecha
    if (cta2Imp > 0 && factura.CTA2_VTO) {
        let estadoVenc2 = 'no-disponible';
        
        if (estado === 'IMPAGA') {
            estadoVenc2 = 'disponible';
        } else if (estado === 'PARCIAL') {
            estadoVenc2 = 'disponible';
        } else if (estado === 'PAGADA') {
            estadoVenc2 = 'pagado';
        }

        vencimientos.push({
            id: `${factura.NROFACT}-2`,
            nroFactura: factura.NROFACT,
            tipo: '2',
            fecha: factura.CTA2_VTO,
            importe: cta2Imp,
            estado: estadoVenc2,
            vencimiento: '2',
            priority: 2
        });
    }

    return vencimientos;
}

// ✅ COMPONENTE DE VENCIMIENTO INDIVIDUAL (TOUCH-FRIENDLY)
function VencimientoButton({ vencimiento, isSelected, isBlocked, onToggle }) {
    const getButtonStyles = () => {
        // ✅ CRÍTICO: Si está pagado, NO permitir selección
        if (vencimiento.estado === 'pagado') {
            return {
                bg: 'bg-blue-500/20 border-blue-400',
                text: 'text-blue-200',
                cursor: 'cursor-not-allowed',
                disabled: true
            };
        }

        // ✅ CRÍTICO: Si está bloqueado por validación, NO permitir
        if (isBlocked || vencimiento.estado === 'no-disponible') {
            return {
                bg: 'bg-red-500/20 border-red-400',  
                text: 'text-red-300',
                cursor: 'cursor-not-allowed',
                disabled: true
            };
        }

        // ✅ Si está seleccionado
        if (isSelected) {
            return {
                bg: 'bg-green-600 border-green-400 shadow-lg shadow-green-600/50',
                text: 'text-white',
                cursor: 'cursor-pointer',
                disabled: false
            };
        }

        // ✅ Disponible para seleccionar
        return {
            bg: 'bg-gray-600/30 border-gray-500 hover:bg-green-600/20 hover:border-green-400',
            text: 'text-gray-200 hover:text-green-200',
            cursor: 'cursor-pointer',
            disabled: false
        };
    };

    const styles = getButtonStyles();

    const getStatusIcon = () => {
        if (vencimiento.estado === 'pagado') return '✅';
        if (isBlocked || vencimiento.estado === 'no-disponible') return '🚫';
        if (isSelected) return '✓';
        return '';
    };

    return (
        <button
            onClick={() => !styles.disabled && onToggle(vencimiento)}
            disabled={styles.disabled}
            className={`
                w-full p-3 rounded-lg border-2 transition-all duration-300 
                ${styles.bg} ${styles.text} ${styles.cursor}
                ${!styles.disabled ? 'active:scale-95 active:shadow-inner' : ''}
                touch-manipulation select-none
                min-h-[60px] flex items-center justify-between
            `}
        >
            <div className="flex flex-col items-start flex-1">
                <div className="flex items-center space-x-2">
                    <span className="font-bold text-lg">
                        {vencimiento.tipo} {vencimiento.fecha}
                    </span>
                    {getStatusIcon() && (
                        <span className="text-lg">{getStatusIcon()}</span>
                    )}
                </div>
                <span className="text-xl opacity-80">
                    ${vencimiento.importe.toLocaleString()}
                </span>
            </div>
        </button>
    );
}

// ✅ COMPONENTE DE TARJETA DE FACTURA RENOVADO
function FacturaCard({ factura, vencimientos, selectedVencimientos, onVencimientoToggle }) {
    const saldo = parseFloat(factura.SALDO || 0);

    const isVencimientoBlocked = (vencimiento) => {
        // Si es el segundo vencimiento, verificar que el primero esté seleccionado
        if (vencimiento.vencimiento === '2') {
            const primerVencimiento = vencimientos.find(v => v.nroFactura === vencimiento.nroFactura && v.vencimiento === '1');
            if (primerVencimiento && primerVencimiento.estado === 'disponible') {
                const primerSeleccionado = selectedVencimientos.some(s => s.id === primerVencimiento.id);
                if (!primerSeleccionado) {
                    return true;
                }
            }
        }
        return false;
    };

    const facturaVencimientos = vencimientos.filter(v => v.nroFactura === factura.NROFACT);

    return (
        <div className='bg-red-900/40 border border-red-500 p-4 rounded-lg flex flex-col min-h-[200px] hover:bg-red-900/50 transition-all'>
            {/* Header */}
            <div className='flex justify-between items-start mb-4'>
                <div>
                    <p className='text-red-200 text-xl uppercase'>FACTURA</p>
                    <p className='text-white font-mono text-xl font-bold'>
                        N {factura.NROFACT}
                    </p>
                </div>
                <div className='text-right'>
                    <p className='text-red-200 text-xl uppercase'>SALDO</p>
                    <p className='text-white text-xl font-bold'>
                        ${saldo.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Vencimientos seleccionables */}
            <div className='flex-1 space-y-2'>
                {facturaVencimientos.map((vencimiento) => (
                    <VencimientoButton
                        key={vencimiento.id}
                        vencimiento={vencimiento}
                        isSelected={selectedVencimientos.some(s => s.id === vencimiento.id)}
                        isBlocked={isVencimientoBlocked(vencimiento)}
                        onToggle={onVencimientoToggle}
                    />
                ))}
            </div>
        </div>
    );
}

// ✅ BOTÓN FLOTANTE DE PAGO MÚLTIPLE
function FloatingPayButton({ selectedCount, totalAmount, onPay, isProcessing }) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-gradient-to-r from-green-600 to-lime-600 rounded-2xl shadow-2xl border border-green-400 p-4">
                <div className="text-center mb-3">
                    <div className="text-white text-xl font-medium">
                        {selectedCount} vencimiento{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}
                    </div>
                    <div className="text-white text-xl font-bold">
                        Total: ${totalAmount.toLocaleString()}
                    </div>
                </div>
                
                <button
                    onClick={onPay}
                    disabled={isProcessing}
                    className={`
                        w-full px-8 py-4 rounded-xl text-white text-lg font-bold
                        transition-all duration-300 active:scale-95 touch-manipulation
                        ${isProcessing 
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        }
                    `}
                >
                    {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Procesando...</span>
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

    // ✅ MEMOIZAR TODOS LOS VENCIMIENTOS DISPONIBLES
    const todosVencimientos = useMemo(() => {
        const vencimientos = [];
        facturasImpagas.forEach(factura => {
            const facturaVencimientos = calcularVencimientosFactura(factura);
            vencimientos.push(...facturaVencimientos);
        });
        return vencimientos;
    }, [facturasImpagas]);

    // ✅ CALCULAR TOTAL SELECCIONADO
    const totalSeleccionado = useMemo(() => {
        return selectedVencimientos.reduce((sum, item) => sum + parseFloat(item.importe || 0), 0);
    }, [selectedVencimientos]);

    // ✅ MANEJAR TOGGLE DE VENCIMIENTO
    const handleVencimientoToggle = useCallback(async (vencimiento) => {
        const exists = selectedVencimientos.find(item => item.id === vencimiento.id);

        if (exists) {
            // Deseleccionar
            const newSelection = selectedVencimientos.filter(item => item.id !== vencimiento.id);
            setSelectedVencimientos(newSelection);
            return;
        }

        // Seleccionar - Validar orden inmediato dentro de la misma factura
        if (vencimiento.vencimiento === '2') {
            const primerVencimiento = todosVencimientos.find(v => 
                v.nroFactura === vencimiento.nroFactura && v.vencimiento === '1'
            );
            
            if (primerVencimiento && primerVencimiento.estado === 'disponible') {
                const primerSeleccionado = selectedVencimientos.some(s => s.id === primerVencimiento.id);
                if (!primerSeleccionado) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Orden de pago incorrecto',
                        text: `Debes seleccionar primero el 1 vencimiento de la factura ${vencimiento.nroFactura}.`,
                        confirmButtonColor: '#dc2626',
                        customClass: {
                            popup: 'rounded-xl shadow-2xl',
                            confirmButton: 'rounded-lg'
                        }
                    });
                    return;
                }
            }
        }

        // Agregar a selección
        const newSelection = [...selectedVencimientos, {
            id: vencimiento.id,
            nis: nis,
            factura: vencimiento.nroFactura,
            vencimiento: vencimiento.fecha,
            amount: vencimiento.importe,
            tipo: vencimiento.tipo === '1' ? '1 Vencimiento' : '2 Vencimiento',
            descripcion: `Factura ${vencimiento.nroFactura} - ${vencimiento.tipo} Vencimiento`,
            importe: vencimiento.importe
        }];

        // Validar orden cronológico entre facturas
        const validationResult = validatePaymentOrder(newSelection, todosVencimientos, hasShownOrderWarning);
        
        if (validationResult?.type === 'warning') {
            const result = await Swal.fire({
                icon: 'warning',
                title: 'Orden de pago recomendado',
                html: validationResult.message,
                showCancelButton: true,
                confirmButtonText: 'Continuar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#059669',
                cancelButtonColor: '#6b7280',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    confirmButton: 'rounded-lg',
                    cancelButton: 'rounded-lg'
                }
            });
            
            setHasShownOrderWarning(true);
            
            if (result.isConfirmed) {
                setSelectedVencimientos(newSelection);
            }
        } else {
            setSelectedVencimientos(newSelection);
        }
    }, [selectedVencimientos, nis, todosVencimientos, hasShownOrderWarning]);

    // ✅ PROCESAR PAGO MÚLTIPLE
    const handlePagoMultiple = useCallback(async () => {
        if (selectedVencimientos.length === 0) return;

        setIsProcessing(true);

        try {
            // Mostrar selector de método de pago
            const { value: metodoPago } = await Swal.fire({
                title: 'Selecciona un método de pago',
                html: `
                    <div style="text-align: left; font-size: 18px;">
                        <label style="${metodoMPHabilitado ? 'color: #009ee3; font-weight: bold;' : 'color: grey;'}; display: block; margin-bottom: 15px; padding: 15px; border: 2px solid ${metodoMPHabilitado ? '#009ee3' : '#ccc'}; border-radius: 8px; cursor: ${metodoMPHabilitado ? 'pointer' : 'not-allowed'};">
                            <input type="radio" name="metodoPago" value="mercadopago" ${metodoMPHabilitado ? '' : 'disabled'} style="margin-right: 10px; transform: scale(1.3);">
                            💳 MercadoPago
                        </label>
                        <label style="${metodoModoHabilitado ? 'color: #059669; font-weight: bold;' : 'color: grey;'}; display: block; padding: 15px; border: 2px solid ${metodoModoHabilitado ? '#059669' : '#ccc'}; border-radius: 8px; cursor: ${metodoModoHabilitado ? 'pointer' : 'not-allowed'};">
                            <input type="radio" name="metodoPago" value="modo" ${metodoModoHabilitado ? '' : 'disabled'} style="margin-right: 10px; transform: scale(1.3);">
                            📱 MODO
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
                    const selected = document.querySelector('input[name="metodoPago"]:checked');
                    if (!selected) {
                        Swal.showValidationMessage('Debes seleccionar un método de pago!');
                    }
                    return selected ? selected.value : null;
                }
            });

            if (!metodoPago) {
                setIsProcessing(false);
                return;
            }

            // Determinar URL del endpoint
            const url = metodoPago === 'mercadopago' 
                ? `${baseUrl}/api/payment-qr-multiple`
                : `${baseUrl}/api/modo/payment-multiple`;

            // Realizar pago múltiple
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: selectedVencimientos })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error ${response.status}`);
            }

            // Mostrar QR y iniciar polling
            if (metodoPago === 'mercadopago' && result.qr_url) {
  await Swal.fire({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <p style="margin-bottom:15px;font-weight:bold;color:#374151;font-size:18px;">Escaneá con tu app para pagar</p>
        <img src="${result.qr_url}" alt="QR MercadoPago" style="display:block;margin:0 auto;border-radius:12px;border:3px solid #f3f4f6;" />
        <div style="margin-top:15px;padding:10px 20px;background:linear-gradient(135deg,#009ee3,#6ec1f2);border-radius:8px;color:white;text-align:center;">
          <div style="font-size:14px;opacity:.9;">Total a pagar</div>
          <div style="font-size:22px;font-weight:bold;">$${totalSeleccionado.toLocaleString()}</div>
          <div style="font-size:12px;opacity:.8;margin-top:2px;">${selectedVencimientos.length} vencimientos</div>
        </div>
      </div>
    `,
    showConfirmButton: false,
    allowOutsideClick: false,
    customClass: { popup: 'rounded-2xl shadow-2xl' },
    didOpen: () => {
      // Usa external_reference o preference_id para el polling
      startMultiplePaymentPolling(result.external_reference || result.preference_id, 'mercadopago');
    }
  });
} else if (metodoPago === 'modo' && result.qr) {
                // Mostrar QR de MODO
                const swalInstance = Swal.fire({
                    html: `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <p style="margin-bottom: 15px; font-weight: bold; color: #374151; font-size: 18px;">Escaneá con tu app MODO</p>
                            <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(result.qr)}&size=280x280" 
                                alt="QR MODO" 
                                style="display: block; margin: 0 auto; border-radius: 12px; border: 3px solid #f3f4f6;" 
                            />
                            <p style="margin-top:20px; font-size:13px; text-align:center; color: #6b7280;">
                                <b>ID de transacción:</b><br>
                                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-family: monospace;">${result.externalIntentionId}</code>
                            </p>
                            <div style="margin-top:15px; padding: 10px 20px; background: linear-gradient(135deg, #059669, #10b981); border-radius: 8px; color: white; text-align: center;">
                                <div style="font-size: 14px; opacity: 0.9;">Total a pagar</div>
                                <div style="font-size: 22px; font-weight: bold;">$${totalSeleccionado.toLocaleString()}</div>
                                <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">${selectedVencimientos.length} vencimientos seleccionados</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    customClass: { popup: 'rounded-2xl shadow-2xl' },
                    didOpen: () => {
                        startMultiplePaymentPolling(result.externalIntentionId);
                    }
                });
            } else {
                throw new Error('Respuesta de pago inválida');
            }

        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error al procesar el pago múltiple: ${error.message}`,
                confirmButtonColor: '#dc2626',
                customClass: {
                    popup: 'rounded-xl shadow-2xl',
                    confirmButton: 'rounded-lg'
                }
            });
        } finally {
            setIsProcessing(false);
        }
    }, [selectedVencimientos, totalSeleccionado, metodoMPHabilitado, metodoModoHabilitado]);

    // ✅ CORRECCIÓN DEL POLLING MERCADOPAGO EN TASFacturasGrid.jsx
// Reemplazar la función startMultiplePaymentPolling completa:

const startMultiplePaymentPolling = useCallback((externalId, metodoPago = 'modo') => {
    let pollingInterval = null;
    let pollingTimeout = null;
    let alertaMostrada = false;
    
    // 🔧 VARIABLES PARA TRACKING DE ESTADO INICIAL
    let estadoInicialMP = null;
    let paymentIdInicialMP = null;
    let primeraVerificacion = true;
    let realPaymentId = null;

    const checkStatus = async () => {
        try {
            let algunPagoExitoso = false;
            
            // ✅ PARA MERCADOPAGO: Lógica corregida con tracking de estado
            if (metodoPago === 'mercadopago') {
                console.log('🔍 Verificando estado MP múltiple...');
                
                // Verificar todas las facturas seleccionadas
                for (const item of selectedVencimientos) {
                    const response = await fetch(
                        `${baseUrl}/api/modo/payment-status?factura=${item.factura}&nis=${item.nis}`
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        console.log(`📊 Estado factura ${item.factura}:`, {
                            status: data.status,
                            payment_id: data.payment_id,
                            timestamp: new Date().toISOString()
                        });
                        
                        // 🔧 PRIMERA VERIFICACIÓN: Guardar estado inicial
                        if (primeraVerificacion) {
                            estadoInicialMP = data.status;
                            paymentIdInicialMP = data.payment_id;
                            console.log(`📝 Estado inicial MP guardado:`, {
                                factura: item.factura,
                                estadoInicial: estadoInicialMP,
                                paymentIdInicial: paymentIdInicialMP
                            });
                            continue; // No verificar cambios en la primera iteración
                        }
                        
                        // 🎯 DETECCIÓN DE PAGO EXITOSO: Solo si hay CAMBIO real
                        const huboCambioEstado = data.status !== estadoInicialMP;
                        const huboNuevoPaymentId = data.payment_id && (data.payment_id !== paymentIdInicialMP);
                        const estadoAprobado = data.status === 'approved' || data.status === 'EN PROCESO';
                        
                        if ((huboNuevoPaymentId || huboCambioEstado) && estadoAprobado) {
                            console.log('✅ CAMBIO DETECTADO EN PAGO MP:', {
                                factura: item.factura,
                                estadoAnterior: estadoInicialMP,
                                estadoActual: data.status,
                                paymentIdAnterior: paymentIdInicialMP,
                                paymentIdActual: data.payment_id,
                                huboNuevoPaymentId,
                                huboCambioEstado
                            });
                            
                            algunPagoExitoso = true;
                            realPaymentId = data.payment_id; 
                            break;
                        }
                        
                        // ❌ PAGO RECHAZADO
                        if (data.status === 'rejected') {
                            clearInterval(pollingInterval);
                            clearTimeout(pollingTimeout);
                            alertaMostrada = true;

                            Swal.fire({
                                icon: 'error',
                                title: 'Pago Múltiple Rechazado',
                                text: 'Tu pago múltiple fue rechazado. Por favor, intentá nuevamente.',
                                confirmButtonColor: '#DC2626'
                            });
                            return;
                        }
                    }
                }
                
                // Marcar que ya no es la primera verificación
                if (primeraVerificacion) {
                    primeraVerificacion = false;
                    console.log('🔄 Primera verificación MP completada, iniciando detección de cambios...');
                }
                
            } else {
                // ✅ PARA MODO: Mantener lógica existente
                for (const item of selectedVencimientos) {
                    const response = await fetch(
                        `${baseUrl}/api/modo/payment-status?factura=${item.factura}&nis=${item.nis}`
                    );
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        if (data.status === 'approved' && data.payment_id?.includes(externalId)) {
                            algunPagoExitoso = true;
                            break;
                        } else if (data.status === 'rejected') {
                            clearInterval(pollingInterval);
                            clearTimeout(pollingTimeout);
                            alertaMostrada = true;

                            Swal.fire({
                                icon: 'error',
                                title: 'Pago Múltiple Rechazado',
                                text: 'Tu pago múltiple fue rechazado. Por favor, intentá nuevamente.',
                                confirmButtonColor: '#DC2626'
                            });
                            return;
                        }
                    }
                }
            }

            if (alertaMostrada) return;

            // ✅ ALERT UNIFICADO - REEMPLAZAR EN startMultiplePaymentPolling

if (algunPagoExitoso) {
    clearInterval(pollingInterval);
    clearTimeout(pollingTimeout);
    alertaMostrada = true;

    // 🎯 ALERT UNIFICADO QUE SE ACTUALIZA
    const unifiedAlert = Swal.fire({
        icon: 'success',
        title: '🎉 ¡Pago Múltiple Exitoso!',
        html: `
            <div style="text-align: center;">
                <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; margin: 15px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 18px;">✅ PAGO PROCESADO CORRECTAMENTE</h3>
                    <p style="margin: 5px 0; color: #374151; font-size: 16px;">
                        Importe: <b style="color: #059669;">$${totalSeleccionado.toLocaleString()}</b>
                    </p>
                    <p style="margin: 5px 0; color: #374151;">
                        ${selectedVencimientos.length} vencimiento${selectedVencimientos.length > 1 ? 's' : ''} actualizado${selectedVencimientos.length > 1 ? 's' : ''}
                    </p>
                </div>
                
                <div id="printing-status" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 15px; margin: 15px 0;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <div class="spinner" style="
                            width: 20px; 
                            height: 20px; 
                            border: 2px solid #f59e0b; 
                            border-top: 2px solid transparent; 
                            border-radius: 50%; 
                            animation: spin 1s linear infinite;
                        "></div>
                        <span id="print-message" style="color: #92400e; font-weight: bold; font-size: 16px;">
                            🖨️ Generando comprobante...
                        </span>
                    </div>
                    <div id="print-progress" style="
                        width: 100%; 
                        height: 4px; 
                        background: #fed7aa; 
                        border-radius: 2px; 
                        margin-top: 10px; 
                        overflow: hidden;
                    ">
                        <div id="progress-bar" style="
                            width: 0%; 
                            height: 100%; 
                            background: #f59e0b; 
                            transition: width 0.5s ease;
                        "></div>
                    </div>
                </div>
                
                <div id="completion-message" style="display: none; background: #dcfce7; border: 2px solid #16a34a; border-radius: 12px; padding: 15px; margin: 15px 0;">
                    <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
                        🎫 ¡Comprobante generado exitosamente!
                    </p>
                </div>
            </div>
            
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `,
        confirmButtonText: 'Ver mi cuenta',
        confirmButtonColor: '#059669',
        allowOutsideClick: false,
        showConfirmButton: false, // ← Ocultar botón inicialmente
        width: 550,
        didOpen: async () => {
            // 🖨️ EJECUTAR IMPRESIÓN CON FEEDBACK VISUAL
            try {
                // Simular progreso de impresión
                updatePrintProgress(0, "Preparando datos del ticket...");
                await new Promise(resolve => setTimeout(resolve, 800));
                
                updatePrintProgress(30, "Conectando con impresora...");
                await new Promise(resolve => setTimeout(resolve, 500));
                
                updatePrintProgress(60, "Enviando a impresión...");
                
                // Ejecutar impresión real
                const printResult = await imprimirTicketPagoMultiple(
                    selectedVencimientos,
                    nis,
                    'CLIENTE',
                    metodoPago.toUpperCase(),
                     realPaymentId || `${Date.now()}`,
                );
                
                updatePrintProgress(100, "Comprobante generado");
                
                // Mostrar completado
                setTimeout(() => {
                    showPrintCompleted(printResult.success);
                }, 500);
                
            } catch (error) {
                console.error('Error en impresión:', error);
                showPrintError(error.message);
            }
        }
    });

    // 🔄 FUNCIÓN PARA ACTUALIZAR PROGRESO
    function updatePrintProgress(percentage, message) {
        const progressBar = document.getElementById('progress-bar');
        const printMessage = document.getElementById('print-message');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        if (printMessage) {
            printMessage.textContent = `🖨️ ${message}`;
        }
    }
    
    // ✅ FUNCIÓN PARA MOSTRAR COMPLETADO
    function showPrintCompleted(success) {
        const printingStatus = document.getElementById('printing-status');
        const completionMessage = document.getElementById('completion-message');
        
        if (success) {
            // Ocultar estado de impresión
            if (printingStatus) {
                printingStatus.style.display = 'none';
            }
            
            // Mostrar mensaje de completado
            if (completionMessage) {
                completionMessage.style.display = 'block';
                completionMessage.innerHTML = `
                    <p style="margin: 0; color: #166534; font-size: 16px; font-weight: bold;">
                        🎫 ¡Comprobante generado exitosamente!
                    </p>
                    <p style="margin: 8px 0 0 0; color: #15803d; font-size: 14px;">
                        El ticket ha sido enviado a la impresora
                    </p>
                `;
            }
        } else {
            // Mostrar mensaje de advertencia si falló la impresión
            if (completionMessage) {
                completionMessage.style.display = 'block';
                completionMessage.style.background = '#fef3c7';
                completionMessage.style.borderColor = '#f59e0b';
                completionMessage.innerHTML = `
                    <p style="margin: 0; color: #92400e; font-size: 16px; font-weight: bold;">
                        ⚠️ Pago exitoso - Error en impresión
                    </p>
                    <p style="margin: 8px 0 0 0; color: #b45309; font-size: 14px;">
                        El pago se procesó correctamente pero no se pudo imprimir
                    </p>
                `;
            }
        }
        
        // Mostrar botón de continuar después de 2 segundos
        setTimeout(() => {
            Swal.update({
                showConfirmButton: true
            });
        }, 2000);
    }
    
    // ❌ FUNCIÓN PARA MOSTRAR ERROR
    function showPrintError(errorMessage) {
        const printingStatus = document.getElementById('printing-status');
        const completionMessage = document.getElementById('completion-message');
        
        if (printingStatus) {
            printingStatus.style.background = '#fef2f2';
            printingStatus.style.borderColor = '#ef4444';
            printingStatus.innerHTML = `
                <p style="margin: 0; color: #dc2626; font-size: 16px; font-weight: bold;">
                    ❌ Error en impresión
                </p>
                <p style="margin: 8px 0 0 0; color: #b91c1c; font-size: 14px;">
                    ${errorMessage}
                </p>
            `;
        }
        
        // Mostrar botón inmediatamente en caso de error
        setTimeout(() => {
            Swal.update({
                showConfirmButton: true
            });
        }, 1000);
    }
    
    // 🔄 MANEJAR CIERRE Y RECARGA
    unifiedAlert.then(() => {
        window.location.reload();
    });
}

        } catch (error) {
            console.error('Error durante polling múltiple:', error);
        }
    };

    // 🚀 INICIAR POLLING
    console.log(`🚀 Iniciando polling ${metodoPago} para external_id: ${externalId}`);
    
    checkStatus(); // Primera verificación inmediata
    pollingInterval = setInterval(checkStatus, 3000); // Cada 3 segundos
    
    // ⏰ TIMEOUT después de 2 minutos
    pollingTimeout = setTimeout(() => {
        clearInterval(pollingInterval);
        if (!alertaMostrada) {
            alertaMostrada = true;
            Swal.fire({
                icon: 'warning',
                title: 'Sin respuesta',
                text: 'No se pudo confirmar el pago en el tiempo esperado.',
                confirmButtonColor: '#F59E0B'
            });
        }
    }, 120000);
}, [selectedVencimientos, totalSeleccionado, nis]);

    if (!facturasImpagas.length) {
        return (
            <div className='bg-green-800/30 p-4 rounded-xl text-center'>
                <p className='text-lg text-green-200'>
                    ✅ No tienes facturas pendientes
                </p>
            </div>
        );
    }

    return (
        <div className='bg-green-800/30 p-2 rounded-lg flex-1 overflow-hidden relative'>
            <h3 className='text-base font-bold mb-2 text-lime-200 text-center'>
                FACTURAS PENDIENTES - SELECCIONA VENCIMIENTOS
            </h3>
            
            <div className='h-full overflow-y-auto pb-32'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-3 auto-rows-max'>
                    {facturasImpagas.map((factura, index) => (
                        <FacturaCard
                            key={index}
                            factura={factura}
                            vencimientos={todosVencimientos}
                            selectedVencimientos={selectedVencimientos}
                            onVencimientoToggle={handleVencimientoToggle}
                        />
                    ))}
                </div>
            </div>

            {/* Botón flotante de pago */}
            <FloatingPayButton
                selectedCount={selectedVencimientos.length}
                totalAmount={totalSeleccionado}
                onPay={handlePagoMultiple}
                isProcessing={isProcessing}
            />

            {/* Estilos para animación */}
            <style jsx global>{`
                @keyframes bounce-in {
                    0% { 
                        transform: translate(-50%, 100%); 
                        opacity: 0; 
                    }
                    60% { 
                        transform: translate(-50%, -10px); 
                        opacity: 1; 
                    }
                    100% { 
                        transform: translate(-50%, 0); 
                        opacity: 1; 
                    }
                }
                
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                
                /* Touch optimization */
                .touch-manipulation {
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                }
                
                /* Prevent text selection on touch */
                .select-none {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                }
                
                /* Smooth scrolling */
                .overflow-y-auto {
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }
                
                /* Hide scrollbar but keep functionality */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                }
                
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
}