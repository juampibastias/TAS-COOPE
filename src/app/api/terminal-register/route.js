// === ARREGLO FINAL DE terminal-register/route.js ===
// REEMPLAZAR COMPLETAMENTE src/app/api/terminal-register/route.js

// Función para extraer IP real del cliente
function getClientIP(request) {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const clientIP = request.headers.get('x-client-ip');
    
    // Prioridad: x-real-ip, x-client-ip, x-forwarded-for
    let detectedIP = realIP || clientIP || (forwardedFor ? forwardedFor.split(',')[0].trim() : null);
    
    // Si no hay headers, usar la IP de la conexión
    if (!detectedIP) {
        // Para Next.js en VPN, necesitamos detectar la IP real del terminal
        // En este caso, el terminal TAS tiene IP VPN 10.10.5.25
        detectedIP = '10.10.5.25';  // 🔧 IP VPN del terminal TAS
    }
    
    // Limpiar formato IPv6 a IPv4
    if (detectedIP && detectedIP.startsWith('::ffff:')) {
        detectedIP = detectedIP.replace('::ffff:', '');
    }
    
    return detectedIP;
}

// Mapeo de IPs VPN a ubicaciones
const VPN_LOCATIONS = {
    '10.10.5.25': 'Cooperativa',           // 🎯 NUESTRO TERMINAL TAS
    //'10.10.5.222': 'TAS Server Principal', // Servidor webapp
};

export async function GET(request) {
    const clientIP = getClientIP(request);
    
    console.log('🔍 [Terminal-Register] IP detectada:', clientIP);
    
    // Verificar si es IP VPN
    if (!clientIP || !clientIP.startsWith('10.10.5.')) {
        return Response.json({
            registered: false,
            reason: 'No es IP VPN',
            detected_ip: clientIP,
            expected_network: '10.10.5.x'
        });
    }
    
    const location = VPN_LOCATIONS[clientIP] || `Terminal ${clientIP.split('.').pop()}`;
    const terminalId = `VPN_${clientIP.split('.').pop()}`;
    
    try {
        console.log(`🔗 [Terminal-Register] Enviando al backend - IP: ${clientIP}, Terminal: ${terminalId}`);
        
        // 🔧 ARREGLO CRÍTICO: Enviar la IP correcta al backend
        const backendResponse = await fetch('http://10.10.5.222:3001/terminalsApi/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': clientIP,  // 🎯 ENVIAR IP CORRECTA
                'X-Real-IP': clientIP,        // 🎯 BACKUP HEADER
                'X-Terminal-Token': process.env.TERMINAL_ACCESS_TOKEN || 'default_token'
            },
            body: JSON.stringify({
                terminal_id: terminalId,
                name: `Terminal ${location}`,
                location: location,
                status: 'online',
                version: '2.0.0-vpn-fixed',
                client_ip: clientIP,
                user_agent: request.headers.get('user-agent'),
                timestamp: new Date().toISOString()
            })
        });
        
        if (backendResponse.ok) {
            const heartbeatData = await backendResponse.json();
            console.log(`✅ [Terminal-Register] Backend response para ${terminalId}:`, heartbeatData);

            // Respuesta con mapeo correcto
            const responseData = {
                registered: true,
                terminal: {
                    id: terminalId,
                    name: `Terminal ${location}`,
                    location: location,
                    ip: clientIP
                },
                command: heartbeatData.command || null,
                command_id: heartbeatData.command_id || null,
                command_data: heartbeatData.command_data || null
            };
            
            // Log del comando
            if (heartbeatData.command) {
                console.log(`📤 [Terminal-Register] ¡COMANDO RECIBIDO!: ${heartbeatData.command} (ID: ${heartbeatData.command_id})`);
            } else {
                console.log(`📭 [Terminal-Register] Sin comandos pendientes para ${terminalId}`);
            }
            
            return Response.json(responseData);
            
        } else {
            const errorText = await backendResponse.text();
            console.log('❌ [Terminal-Register] Error del backend:', backendResponse.status, errorText);
            return Response.json({
                registered: false,
                reason: 'Error en backend',
                backend_status: backendResponse.status,
                backend_error: errorText
            });
        }
        
    } catch (error) {
        console.error('❌ [Terminal-Register] Error:', error);
        return Response.json({
            registered: false,
            reason: 'Error de conexión',
            error: error.message
        });
    }
}

export async function POST(request) {
    const clientIP = getClientIP(request);
    
    console.log('💓 [Terminal-Register] Heartbeat POST desde IP:', clientIP);
    
    // Verificar si es IP VPN
    if (!clientIP || !clientIP.startsWith('10.10.5.')) {
        return Response.json({
            registered: false,
            reason: 'No es IP VPN',
            detected_ip: clientIP,
            expected_network: '10.10.5.x'
        }, { status: 403 });
    }
    
    const location = VPN_LOCATIONS[clientIP] || `Terminal ${clientIP.split('.').pop()}`;
    const terminalId = `VPN_${clientIP.split('.').pop()}`;
    
    try {
        // Obtener datos del cuerpo de la petición
        const body = await request.json();
        console.log('📡 [Terminal-Register] POST data:', body);
        
        const status = body.status || 'online';
        const maintenanceActive = body.maintenance_active || false;
        const version = body.version || '2.0.0-vpn-fixed';
        
        console.log(`🔗 [Terminal-Register] POST al backend - IP: ${clientIP}, Terminal: ${terminalId}`);
        
        // 🔧 ARREGLO CRÍTICO: Enviar la IP correcta al backend
        const backendResponse = await fetch('http://10.10.5.222:3001/terminalsApi/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': clientIP,  // 🎯 ENVIAR IP CORRECTA
                'X-Real-IP': clientIP,        // 🎯 BACKUP HEADER
                'X-Terminal-Token': process.env.TERMINAL_ACCESS_TOKEN || 'default_token'
            },
            body: JSON.stringify({
                terminal_id: terminalId,
                name: `Terminal ${location}`,
                location: location,
                status: status,
                maintenance_active: maintenanceActive,
                version: version,
                last_command: body.last_command || null,
                command_count: body.command_count || 0,
                hardware_info: body.hardware_info || null,
                client_ip: clientIP,
                user_agent: request.headers.get('user-agent'),
                timestamp: new Date().toISOString()
            })
        });
        
        if (backendResponse.ok) {
            const heartbeatData = await backendResponse.json();
            
            console.log(`✅ [Terminal-Register] POST response para ${terminalId}:`, heartbeatData);

            const responseData = {
                registered: true,
                terminal: {
                    id: terminalId,
                    name: `Terminal ${location}`,
                    location: location,
                    ip: clientIP,
                    status: status,
                    maintenance_active: maintenanceActive
                },
                command: heartbeatData.command || null,
                command_id: heartbeatData.command_id || null,
                command_data: heartbeatData.command_data || null,
                timestamp: new Date().toISOString()
            };
            
            // Log del comando
            if (heartbeatData.command) {
                console.log(`📤 [Terminal-Register] POST ¡COMANDO RECIBIDO!: ${heartbeatData.command} (ID: ${heartbeatData.command_id})`);
            } else {
                console.log(`📭 [Terminal-Register] POST sin comandos para ${terminalId}`);
            }
            
            return Response.json(responseData);
            
        } else {
            const errorText = await backendResponse.text();
            console.log('❌ [Terminal-Register] POST error del backend:', backendResponse.status, errorText);
            return Response.json({
                registered: false,
                reason: 'Error en backend',
                backend_status: backendResponse.status,
                backend_error: errorText
            }, { status: 502 });
        }
        
    } catch (error) {
        console.error('❌ [Terminal-Register] POST error:', error);
        return Response.json({
            registered: false,
            reason: 'Error interno del servidor',
            error: error.message
        }, { status: 500 });
    }
}