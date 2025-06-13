// src/app/api/payment-status/[factura]/[nis]/route.js
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { factura, nis } = params;

        console.log(`📡 Verificando estado - Factura: ${factura}, NIS: ${nis}`);

        // Para testing - simular pago completado después de 15 segundos
        const timeElapsed = Date.now() % 30000; // Reset cada 30 segundos
        const isCompleted = timeElapsed > 15000; // Completo después de 15 segundos

        if (isCompleted) {
            return NextResponse.json({
                status: 'approved',
                payment_id: 'EMV_' + Date.now(),
                wallet_source: 'QR_EMV_TEST',
                amount: 165500,
                timestamp: new Date().toISOString(),
                method: 'emv_qr',
            });
        }

        return NextResponse.json({
            status: 'pending',
            message: 'Pago en proceso',
        });
    } catch (error) {
        console.error('❌ Error en payment-status:', error);
        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        );
    }
}
