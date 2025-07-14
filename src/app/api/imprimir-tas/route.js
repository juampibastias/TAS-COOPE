// src/app/api/imprimir-tas/route.js - App Router VPN
export async function GET() {
    console.log('📋 [App-API] Health Check solicitado');
    return Response.json({
        success: true,
        servicio: 'TAS Impresion API',
        version: '2.0-app-router',
        vpn_target: '10.10.5.25:9100',
        timestamp: new Date().toISOString()
    });
}

export async function POST(request) {
    console.log('🖨️ [App-API] POST recibido');
    
    try {
        const body = await request.json();
        const { datos } = body;
        
        const targetIP = '10.10.5.25';
        const tasUrl = `http://${targetIP}:9100/imprimir`;
        
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
                transaccion: datos.transactionId || datos.transaccion || 'N/A'
            }),
            signal: AbortSignal.timeout(10000)
        });
        
        if (!respuesta.ok) {
            throw new Error(`TAS respondió con status ${respuesta.status}`);
        }
        
        const data = await respuesta.json();
        
        return Response.json({
            success: true,
            data: data,
            mensaje: 'Impresión enviada via VPN App Router',
            targetIP: targetIP
        });
        
    } catch (error) {
        console.error('❌ [App-API] Error:', error.message);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
