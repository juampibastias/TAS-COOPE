// src/app/api/terminal-register/route.js - VERSIÓN CORREGIDA CON ESTADO DE MANTENIMIENTO

// Función para extraer IP real del cliente
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

// Mapeo de IPs VPN a ubicaciones
const VPN_LOCATIONS = {
    '10.10.5.25': 'Cooperativa',
    '10.10.5.26': 'Disponible para uso', 
    '10.10.5.27': 'Disponible para uso',
    '10.10.5.28': 'Disponible para uso',
    '10.10.5.29': 'Disponible para uso',
    '10.10.5.30': 'Disponible para uso',
    '10.10.5.31': 'Disponible para uso',
    '10.10.5.32': 'Disponible para uso',
    '10.10.5.33': 'Disponible para uso',
    '10.10.5.34': 'Disponible para uso',
    '10.10.5.35': 'Disponible para uso',
    '10.10.5.222': 'TAS Server Principal'
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
        // Registrar/actualizar terminal en el backend con estado
        const backendResponse = await fetch('http://localhost:3001/terminalsApi/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': clientIP,
                'X-Terminal-Token': process.env.TERMINAL_ACCESS_TOKEN || 'default_token'
            },
            body: JSON.stringify({
                // 📡 DATOS BÁSICOS
                terminal_id: terminalId,
                name: `Terminal ${location}`,
                location: location,
                
                // 📡 ESTADO (por defecto online, se actualizará con POST)
                status: 'online',
                version: '2.0.0-vpn',
                
                // 📡 METADATOS
                client_ip: clientIP,
                user_agent: request.headers.get('user-agent'),
                timestamp: new Date().toISOString()
            })
        });
        
        if (backendResponse.ok) {
            const heartbeatData = await backendResponse.json();
            console.log(`✅ [Terminal-Register] Terminal registrada: ${terminalId}`);

            // Preparar respuesta con comando si existe
            const responseData = {
                registered: true,
                terminal: {
                    id: terminalId,
                    name: `Terminal ${location}`,
                    location: location,
                    ip: clientIP
                },
                command: heartbeatData.command || null,
                command_id: heartbeatData.commandId || null,
                command_data: heartbeatData.commandData || null
            };
            
            // Log del comando
            if (heartbeatData.command) {
                console.log(`📤 [Terminal-Register] Comando encontrado: ${heartbeatData.command}`);
            } else {
                console.log(`📭 [Terminal-Register] Sin comandos pendientes para ${terminalId}`);
            }
            
            return Response.json(responseData);
            
        } else {
            console.log('❌ [Terminal-Register] Error del backend:', await backendResponse.text());
            return Response.json({
                registered: false,
                reason: 'Error en backend',
                backend_status: backendResponse.status
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

// 🆕 MÉTODO POST PARA HEARTBEAT CON ESTADO DE MANTENIMIENTO
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
        console.log('📡 [Terminal-Register] Datos recibidos:', body);
        
        // Extraer estado de mantenimiento
        const status = body.status || 'online';
        const maintenanceActive = body.maintenance_active || false;
        const version = body.version || '2.0.0-vpn';
        
        // Registrar/actualizar terminal en el backend con estado correcto
        const backendResponse = await fetch('http://localhost:3001/terminalsApi/heartbeat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': clientIP,
                'X-Terminal-Token': process.env.TERMINAL_ACCESS_TOKEN || 'default_token'
            },
            body: JSON.stringify({
                // 📡 DATOS BÁSICOS
                terminal_id: terminalId,
                name: `Terminal ${location}`,
                location: location,
                
                // 📡 ESTADO ACTUAL (IMPORTANTE)
                status: status,
                maintenance_active: maintenanceActive,
                version: version,
                
                // 📡 DATOS ADICIONALES
                last_command: body.last_command || null,
                command_count: body.command_count || 0,
                hardware_info: body.hardware_info || null,
                
                // 📡 METADATOS
                client_ip: clientIP,
                user_agent: request.headers.get('user-agent'),
                timestamp: new Date().toISOString()
            })
        });
        
        if (backendResponse.ok) {
            const heartbeatData = await backendResponse.json();
            
            console.log(`✅ [Terminal-Register] Heartbeat procesado para ${terminalId}:`, {
                status: status,
                maintenance_active: maintenanceActive,
                comando: heartbeatData.command || 'ninguno'
            });

            // Preparar respuesta con comando si existe
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
                command_id: heartbeatData.commandId || null,
                command_data: heartbeatData.commandData || null,
                timestamp: new Date().toISOString()
            };
            
            // Log del comando
            if (heartbeatData.command) {
                console.log(`📤 [Terminal-Register] Comando encontrado: ${heartbeatData.command} (ID: ${heartbeatData.commandId})`);
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
            }, { status: 502 });
        }
        
    } catch (error) {
        console.error('❌ [Terminal-Register] Error procesando POST:', error);
        return Response.json({
            registered: false,
            reason: 'Error interno del servidor',
            error: error.message
        }, { status: 500 });
    }
}