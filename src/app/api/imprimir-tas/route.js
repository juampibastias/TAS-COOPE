// src/app/api/imprimir-tas/route.js - Next.js 13+ App Router
export async function POST(request) {
    try {
        const { ipTAS, datos } = await request.json();

        console.log(`🖨️ Conectando a TAS: http://${ipTAS}:9100/imprimir`);
        console.log('📄 Datos del ticket:', datos);

        const respuesta = await fetch(`http://${ipTAS}:9100/imprimir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        if (!respuesta.ok) {
            throw new Error(`TAS respondió con status ${respuesta.status}`);
        }

        const data = await respuesta.json();
        console.log('✅ Respuesta exitosa del TAS:', data);

        return Response.json({
            success: true,
            data: data,
            mensaje: 'Impresión enviada correctamente al TAS',
        });
    } catch (error) {
        console.error('❌ Error al conectar con TAS:', error.message);

        return Response.json(
            {
                success: false,
                error: 'Fallo al imprimir en TAS',
                detalle: error.message,
                ipTAS: 'Error de conexión',
            },
            { status: 500 }
        );
    }
}

// Manejar OPTIONS para CORS
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
