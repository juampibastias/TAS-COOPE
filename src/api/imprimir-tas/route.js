// src/api/imprimir-tas/route.js
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).end('Método no permitido');

    try {
        const { ipTAS, datos } = req.body;

        console.log(
            `🖨️ Enviando impresión a TAS: http://${ipTAS}:9100/imprimir`
        );
        console.log('📄 Datos:', datos);

        const respuesta = await fetch(`http://${ipTAS}:9100/imprimir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        if (!respuesta.ok) {
            throw new Error(`TAS respondió con status ${respuesta.status}`);
        }

        const data = await respuesta.json();
        console.log('✅ Respuesta del TAS:', data);

        res.status(200).json(data);
    } catch (error) {
        console.error('❌ Error al imprimir en TAS:', error.message);
        res.status(500).json({
            error: 'Fallo al imprimir en TAS',
            detalle: error.message,
            ipTAS: req.body.ipTAS,
        });
    }
}
