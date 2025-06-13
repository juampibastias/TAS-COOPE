// src/app/api/emv-qr/generate/route.js
import { NextResponse } from 'next/server';
import {
    generateEMVQR,
    validateEMVQR,
} from '../../../../lib/emvQrGenerator.js';

export async function POST(request) {
    try {
        const body = await request.json();
        console.log('📋 Generando QR EMV:', body);

        // Generar QR EMV
        const emvQRString = generateEMVQR(body);

        // Validar QR generado
        const validation = validateEMVQR(emvQRString);

        if (!validation.valid) {
            return NextResponse.json(
                {
                    error: 'QR EMV inválido',
                    details: validation.errors,
                },
                { status: 400 }
            );
        }

        console.log('✅ QR EMV generado exitosamente');

        return NextResponse.json({
            qr_code: emvQRString,
            qr_url: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                emvQRString
            )}&size=300x300`,
            status: 'success',
            validation: validation,
            metadata: {
                length: emvQRString.length,
                generated_at: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('❌ Error generando QR EMV:', error);

        return NextResponse.json(
            {
                error: 'Error interno',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'info';

    if (mode === 'test') {
        const testData = {
            merchant_account_information: {
                '02': 'COOPE_TEST_001',
                '03': 'TEST_' + Date.now().toString().slice(-6),
            },
            merchant_category_code: '4814',
            transaction_currency: '032',
            transaction_amount: '100000',
            country_code: 'AR',
            merchant_name: 'COOPERATIVA POPULAR',
            merchant_city: 'RIVADAVIA',
            50: '30123456789',
            additional_data_field_template: {
                bill_number: 'TEST_123',
                customer_id: '7000001',
                due_date: '20/03/2025',
            },
        };

        try {
            const emvQRString = generateEMVQR(testData);
            const validation = validateEMVQR(emvQRString);

            return NextResponse.json({
                test_qr: emvQRString,
                test_url: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                    emvQRString
                )}&size=300x300`,
                validation: validation,
                test_data: testData,
                instructions: 'Escanear con cualquier billetera compatible',
            });
        } catch (error) {
            return NextResponse.json(
                { error: 'Error generando QR test', details: error.message },
                { status: 500 }
            );
        }
    }

    return NextResponse.json({
        api: 'EMV QR Generator',
        status: 'active',
        endpoints: {
            'GET ?mode=test': 'Generar QR de prueba',
            POST: 'Generar QR personalizado',
        },
    });
}
