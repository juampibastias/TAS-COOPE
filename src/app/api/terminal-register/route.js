// src/app/api/terminal-register/route.js - VERSIÓN CORREGIDA FINAL

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
};

export async function GET(request) {
  const clientIP = getClientIP(request);
  
  console.log('🔍 [Terminal-Register] IP detectada:', clientIP);
  
  // Verificar si es IP VPN
  if (!clientIP || !clientIP.startsWith('10.10.5.')) {
    return Response.json({
      registered: false,
      reason: 'No es IP VPN',
      detected_ip: clientIP
    });
  }
  
  const location = VPN_LOCATIONS[clientIP] || `Terminal ${clientIP.split('.').pop()}`;
  const terminalId = `VPN_${clientIP.split('.').pop()}`;
  
  try {
    // Registrar terminal en el backend (heartbeat)
    const backendResponse = await fetch('http://localhost:3001/terminalsApi/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': clientIP  // ← Simular IP VPN
      },
      body: JSON.stringify({
        status: 'online',
        version: '2.0.0-vpn'
      })
    });
    
    if (backendResponse.ok) {
      const heartbeatData = await backendResponse.json();  // ← Obtener datos del heartbeat
      console.log(`✅ [Terminal-Register] Terminal registrada: ${terminalId}`);

      // Preparar respuesta usando datos del heartbeat
      let responseData = {
        registered: true,
        terminal: {
          id: terminalId,
          name: `Terminal ${location}`,
          location: location,
          ip: clientIP
        },
        command: heartbeatData.command || null  // ← Usar comando del heartbeat
      };
      
      // Log del comando
      if (heartbeatData.command) {
        console.log(`📤 [Terminal-Register] Comando encontrado: ${heartbeatData.command}`);
      } else {
        console.log(`📭 [Terminal-Register] Sin comandos pendientes para ${terminalId}`);
      }
      
      // Retornar respuesta única con toda la información
      return Response.json(responseData);
      
    } else {
      console.log('❌ [Terminal-Register] Error del backend:', await backendResponse.text());
      return Response.json({
        registered: false,
        reason: 'Error en backend'
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