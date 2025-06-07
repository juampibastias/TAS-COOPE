// testPrintFunction.js - Función para testing desde la consola del navegador

import {
    imprimirTicketTermico,
    prepararDatosTicket,
} from './thermalPrinterService';

// Función global para testing desde la consola
window.testPrintTicket = async (customData = {}) => {
    console.log('🧪 Iniciando test de impresión...');

    // Datos de ejemplo
    const defaultData = {
        cliente: { NOMBRE: 'ABALLAY ANTONIO' },
        nis: '7000001',
        factura: '1184691',
        paymentData: {
            fecha: '12/03/2025',
            importe: '165500',
            vencimiento: '1',
        },
        transactionId: 'TEST_' + Date.now(),
    };

    // Merge con datos custom
    const testData = { ...defaultData, ...customData };

    try {
        // Preparar datos del ticket
        const datosTicket = prepararDatosTicket(
            testData.factura,
            testData.nis,
            testData.cliente,
            testData.paymentData,
            testData.transactionId
        );

        console.log('📋 Datos del ticket preparados:', datosTicket);

        // Intentar imprimir
        await imprimirTicketTermico(datosTicket);

        console.log('✅ Test de impresión completado');
        return { success: true, datos: datosTicket };
    } catch (error) {
        console.error('❌ Error en test de impresión:', error);
        return { success: false, error: error.message };
    }
};

// Función para testing con la API del servidor
window.testPrintAPI = async (customData = {}, testMode = 'success') => {
    console.log('🧪 Testing API de impresión...');

    const defaultData = {
        cliente: 'ABALLAY ANTONIO',
        nis: '7000001',
        factura: '1184691',
        fecha: '12/03/2025',
        importe: '165500',
        vencimiento: '1° Vencimiento',
        metodoPago: 'MODO',
        testMode: testMode,
    };

    const testData = { ...defaultData, ...customData };

    try {
        const response = await fetch('/api/test-print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData),
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ API Test exitoso:', result);
            if (result.ticketPreview) {
                console.log('📄 Vista previa del ticket:');
                console.log(result.ticketPreview);
            }
        } else {
            console.error('❌ API Test falló:', result);
        }

        return result;
    } catch (error) {
        console.error('❌ Error llamando API:', error);
        return { success: false, error: error.message };
    }
};

// Función para mostrar comandos curl
window.showCurlCommands = () => {
    const baseUrl = window.location.origin;

    console.log('📋 Comandos CURL para testing:');
    console.log('');

    // Curl básico
    console.log('🔹 Test básico (exitoso):');
    console.log(`curl -X POST ${baseUrl}/api/test-print \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente": "ABALLAY ANTONIO",
    "nis": "7000001",
    "factura": "1184691",
    "fecha": "12/03/2025",
    "importe": "165500",
    "vencimiento": "1° Vencimiento",
    "metodoPago": "MODO"
  }'`);

    console.log('');
    console.log('🔹 Test error de impresora:');
    console.log(`curl -X POST ${baseUrl}/api/test-print \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente": "ABALLAY ANTONIO",
    "nis": "7000001",
    "factura": "1184691",
    "importe": "165500",
    "testMode": "printer_error"
  }'`);

    console.log('');
    console.log('🔹 Test puerto ocupado:');
    console.log(`curl -X POST ${baseUrl}/api/test-print \\
  -H "Content-Type: application/json" \\
  -d '{
    "cliente": "ABALLAY ANTONIO",
    "nis": "7000001",
    "factura": "1184691",
    "importe": "165500",
    "testMode": "port_busy"
  }'`);

    console.log('');
    console.log('🔹 Obtener ejemplo automático:');
    console.log(`curl ${baseUrl}/api/test-print?formato=curl`);
};

// Función para configurar impresión automática
window.toggleAutoPrint = (enabled) => {
    if (typeof enabled === 'undefined') {
        const current = localStorage.getItem('autoPrintEnabled') !== 'false';
        enabled = !current;
    }

    localStorage.setItem('autoPrintEnabled', enabled.toString());
    console.log(
        `🖨️ Impresión automática ${enabled ? 'HABILITADA' : 'DESHABILITADA'}`
    );
    return enabled;
};

// Mostrar funciones disponibles al cargar
console.log('🧪 Funciones de testing disponibles:');
console.log('- testPrintTicket(customData): Test directo de impresión');
console.log('- testPrintAPI(customData, testMode): Test via API');
console.log('- showCurlCommands(): Mostrar comandos curl');
console.log(
    '- toggleAutoPrint(enabled): Habilitar/deshabilitar impresión automática'
);
console.log('');
console.log('Ejemplos:');
console.log('testPrintTicket()');
console.log('testPrintAPI({}, "printer_error")');
console.log('showCurlCommands()');
