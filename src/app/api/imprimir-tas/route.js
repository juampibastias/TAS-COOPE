// src/app/api/imprimir-tas/route.js - Con detección de IP VPN

// Función para extraer la IP real del cliente
function getClientIP(request) {
    // Intentar diferentes headers en orden de prioridad
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    
    let detectedIP = null;
    let source = 'unknown';
    
    if (forwardedFor) {
        // x-forwarded-for puede contener múltiples IPs separadas por coma
        detectedIP = forwardedFor.split(',')[0].trim();
        source = 'x-forwarded-for';
    } else if (realIP) {
        detectedIP = realIP;
        source = 'x-real-ip';
    } else if (clientIP) {
        detectedIP = clientIP;
        source = 'x-client-ip';
    }
    
    // Determinar si es IP VPN (rango 10.10.5.x)
    const isVPN = detectedIP && detectedIP.startsWith('10.10.5.');
    
    return {
        ip: detectedIP,
        source: source,
        isVPN: isVPN,
        headers: {
            'x-forwarded-for': forwardedFor,
            'x-real-ip': realIP,
            'x-client-ip': clientIP,
            'x-forwarded-proto': forwardedProto
        }
    };
}

export async function GET() {
    console.log('📋 [App-API] Health Check solicitado');
    return Response.json({
        success: true,
        servicio: 'TAS Impresion API',
        version: '2.0-app-router-vpn',
        vpn_target: '10.10.5.25:9100',
        timestamp: new Date().toISOString()
    });
}

export async function POST(request) {
    console.log('🖨️ [App-API] POST recibido');
    
    // 🎯 DETECTAR IP VPN
    const clientInfo = getClientIP(request);
    
    console.log('🔍 [IP-DETECTION] Información del cliente:', {
        ip: clientInfo.ip,
        source: clientInfo.source,
        isVPN: clientInfo.isVPN,
        headers: clientInfo.headers
    });
    
    try {
        const body = await request.json();
        const { datos } = body;
        
        // Por ahora seguimos usando la IP hardcodeada, pero ya detectamos la real
        const targetIP = '10.10.5.25';
        const tasUrl = `http://${targetIP}:9100/imprimir`;
        
        console.log(`🎯 [App-API] Cliente desde: ${clientInfo.ip || 'unknown'} ${clientInfo.isVPN ? '(VPN)' : '(NO-VPN)'}`);
        console.log(`🎯 [App-API] Conectando via VPN a: ${tasUrl}`);
        
        const respuesta = await fetch(tasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente: datos.cliente || 'Cliente',
                nis: datos.nis || 'N/A', 
                factura: datos.factura || 'N/A',
                fecha: datos.fecha || new Date().toLocaleDateString('es-AR'),
                importe: datos.importe || '0',
                vencimiento: datos.vencimiento || '1° Vencimiento',
                metodoPago: datos.metodoPago || 'MERCADOPAGO',
                transaccion: datos.transactionId || datos.transaccion || 'N/A',
                // 🆕 Metadatos VPN
                vpnInfo: {
                    clientIP: clientInfo.ip,
                    isVPN: clientInfo.isVPN,
                    source: clientInfo.source,
                    timestamp: new Date().toISOString()
                }
            }),
            signal: AbortSignal.timeout(30000)
        });
        
        if (!respuesta.ok) {
            throw new Error(`TAS respondió con status ${respuesta.status}`);
        }
        
        const data = await respuesta.json();
        
        return Response.json({
            success: true,
            data: data,
            mensaje: 'Impresión enviada via VPN App Router',
            targetIP: targetIP,
            // 🆕 Información de detección VPN
            vpnDetection: {
                clientIP: clientInfo.ip,
                isVPN: clientInfo.isVPN,
                detectionSource: clientInfo.source
            }
        });
        
    } catch (error) {
        console.error('❌ [App-API] Error:', error.message);
        console.error('❌ [App-API] Cliente era:', clientInfo.ip || 'unknown');
        
        return Response.json({
            success: false,
            error: error.message,
            // 🆕 Incluir info VPN también en errores
            vpnDetection: {
                clientIP: clientInfo.ip,
                isVPN: clientInfo.isVPN,
                detectionSource: clientInfo.source
            }
        }, { status: 500 });
    }
}