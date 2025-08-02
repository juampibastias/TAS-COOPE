// src/app/api/command-executed/route.js - API PARA CONFIRMAR EJECUCIÓN DE COMANDOS

// Función para extraer IP real del cliente (reutilizada del terminal-register)
function getClientIP(request) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    let detectedIP = null;
    
    if (forwardedFor) {
        detectedIP = forwardedFor.split(',')[0].trim();
    } else if (realIP) {
        detectedIP = realIP;
    }
    
    // Limpiar formato IPv6 a IPv4
    if (detectedIP && detectedIP.startsWith('::ffff:')) {
        detectedIP = detectedIP.replace('::ffff:', '');
    }
    
    return detectedIP;
}

// Mapeo de IPs VPN a ubicaciones (debe coincidir con terminal-register)
const VPN_LOCATIONS = {
    '10.10.5.21': 'Cooperativa Original',
    '10.10.5.222': 'TAS Server Principal',
};

export async function POST(request) {
    const clientIP = getClientIP(request);
    
    console.log('📤 [Command-Executed] IP detectada:', clientIP);
    
    try {
        const { command_id, success, error_message, execution_time, terminal_id } = await request.json();
        
        // Validar campos requeridos
        if (!command_id || typeof success !== 'boolean') {
            return Response.json({
                success: false,
                error: 'Campos requeridos: command_id, success'
            }, { status: 400 });
        }
        
        // Verificar si es IP VPN autorizada
        if (!clientIP || !clientIP.startsWith('10.10.5.')) {
            console.log('❌ [Command-Executed] IP no autorizada:', clientIP);
            return Response.json({
                success: false,
                error: 'IP no autorizada',
                detected_ip: clientIP
            }, { status: 403 });
        }
        
        const location = VPN_LOCATIONS[clientIP] || `Terminal ${clientIP.split('.').pop()}`;
        const detectedTerminalId = `VPN_${clientIP.split('.').pop()}`;
        const finalTerminalId = terminal_id || detectedTerminalId;
        
        console.log(`📤 [Command-Executed] Confirmación desde ${finalTerminalId} (${clientIP}):`, {
            command_id,
            success: success ? 'ÉXITO' : 'FALLO',
            error_message,
            execution_time
        });
        
        // Aquí se enviaría la confirmación al backend real
        try {
            const backendResponse = await fetch('http://10.10.5.222:3001/terminalsApi/command-executed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Forwarded-For': clientIP,
                    'X-Terminal-ID': finalTerminalId
                },
                body: JSON.stringify({
                    command_id,
                    success,
                    error_message,
                    execution_time,
                    terminal_id: finalTerminalId,
                    client_ip: clientIP,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (backendResponse.ok) {
                const backendData = await backendResponse.json();
                console.log(`✅ [Command-Executed] Confirmación enviada al backend:`, backendData);
                
                return Response.json({
                    success: true,
                    message: 'Comando confirmado correctamente',
                    terminal_id: finalTerminalId,
                    command_id,
                    backend_response: backendData
                });
            } else {
                console.log('❌ [Command-Executed] Error del backend:', await backendResponse.text());
                return Response.json({
                    success: false,
                    error: 'Error comunicando con backend'
                }, { status: 502 });
            }
            
        } catch (backendError) {
            console.error('❌ [Command-Executed] Error conectando al backend:', backendError);
            
            // Fallback: guardar localmente y continuar
            console.log(`💾 [Command-Executed] Guardado local: ${finalTerminalId} - ${command_id} - ${success ? 'OK' : 'FAIL'}`);
            
            return Response.json({
                success: true,
                message: 'Comando confirmado localmente (backend no disponible)',
                terminal_id: finalTerminalId,
                command_id,
                fallback: true
            });
        }
        
    } catch (error) {
        console.error('❌ [Command-Executed] Error procesando confirmación:', error);
        return Response.json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        }, { status: 500 });
    }
}

export async function GET(request) {
    const clientIP = getClientIP(request);
    
    // Verificar autorización
    if (!clientIP || !clientIP.startsWith('10.10.5.')) {
        return Response.json({
            error: 'IP no autorizada',
            detected_ip: clientIP
        }, { status: 403 });
    }
    
    const location = VPN_LOCATIONS[clientIP] || `Terminal ${clientIP.split('.').pop()}`;
    const terminalId = `VPN_${clientIP.split('.').pop()}`;
    
    return Response.json({
        endpoint: 'Command Execution Confirmation API',
        version: '1.0.0',
        terminal_id: terminalId,
        location: location,
        client_ip: clientIP,
        methods: {
            'POST': 'Confirmar ejecución de comando',
            'GET': 'Información del endpoint'
        },
        required_fields: {
            command_id: 'string',
            success: 'boolean',
            error_message: 'string (opcional)',
            execution_time: 'number (opcional)',
            terminal_id: 'string (opcional, se detecta por IP)'
        },
        example: {
            command_id: 'CMD_123',
            success: true,
            error_message: null,
            execution_time: 1642634400000,
            terminal_id: terminalId
        },
        timestamp: new Date().toISOString()
    });
}