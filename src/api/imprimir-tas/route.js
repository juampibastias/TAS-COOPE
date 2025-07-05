//src/api/imprimir-tas/route.js
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).end('Método no permitido');

    try {
        const { ipTAS, datos } = req.body;

        const respuesta = await fetch(`http://${ipTAS}:9100/imprimir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        });

        const data = await respuesta.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error al imprimir en TAS:', error);
        res.status(500).json({ error: 'Fallo al imprimir en TAS' });
    }
}
