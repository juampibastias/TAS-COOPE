// lib/emvQrGenerator.js - Generador EMV QR simplificado

// Función para calcular CRC16-CCITT
function calculateCRC16(data) {
    let crc = 0xffff;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;

        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc <<= 1;
            }
            crc &= 0xffff;
        }
    }

    return crc;
}

// Función para crear string TLV
function createTLV(tag, value) {
    if (!tag || value === undefined || value === null) return '';

    const valueStr = value.toString();
    const length = valueStr.length.toString().padStart(2, '0');
    return tag + length + valueStr;
}

// Función principal para generar QR EMV
export function generateEMVQR(paymentData) {
    console.log('🔧 Generando QR EMV:', paymentData);

    try {
        let qrString = '';

        // 00: Payload Format Indicator (obligatorio)
        qrString += createTLV('00', '01');

        // 01: Point of Initiation Method (obligatorio)
        qrString += createTLV('01', '12');

        // 26: Merchant Account Information (obligatorio)
        let merchantInfo = '';
        merchantInfo += createTLV('00', 'AR.COM.COOPERATIVAPOPULAR');
        merchantInfo += createTLV(
            '01',
            paymentData.merchant_account_information?.['02'] || 'COOPE_001'
        );
        merchantInfo += createTLV(
            '02',
            paymentData.merchant_account_information?.['03'] || 'REF'
        );
        qrString += createTLV('26', merchantInfo);

        // 52: Merchant Category Code (obligatorio)
        qrString += createTLV(
            '52',
            paymentData.merchant_category_code || '4814'
        );

        // 53: Transaction Currency (obligatorio)
        qrString += createTLV('53', paymentData.transaction_currency || '032');

        // 54: Transaction Amount (condicional)
        if (paymentData.transaction_amount) {
            const amount = parseFloat(paymentData.transaction_amount).toFixed(
                2
            );
            qrString += createTLV('54', amount);
        }

        // 58: Country Code (obligatorio)
        qrString += createTLV('58', paymentData.country_code || 'AR');

        // 59: Merchant Name (obligatorio)
        const merchantName = (
            paymentData.merchant_name || 'COOPERATIVA POPULAR'
        ).substring(0, 25);
        qrString += createTLV('59', merchantName);

        // 60: Merchant City (obligatorio)
        const merchantCity = (
            paymentData.merchant_city || 'ARGENTINA'
        ).substring(0, 15);
        qrString += createTLV('60', merchantCity);

        // 62: Additional Data Field Template
        if (paymentData.additional_data_field_template) {
            let additionalData = '';
            const template = paymentData.additional_data_field_template;

            if (template.bill_number) {
                additionalData += createTLV('01', template.bill_number);
            }
            if (template.customer_id) {
                additionalData += createTLV('02', template.customer_id);
            }
            if (template.due_date) {
                additionalData += createTLV('03', template.due_date);
            }

            if (additionalData) {
                qrString += createTLV('62', additionalData);
            }
        }

        // 50: CUIT del comercio (Argentina específico)
        if (paymentData['50']) {
            qrString += createTLV('50', paymentData['50']);
        }

        // 63: CRC (obligatorio) - calculado al final
        const qrWithCRCPlaceholder = qrString + '6304';
        const crc = calculateCRC16(qrWithCRCPlaceholder);
        const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
        qrString += createTLV('63', crcHex);

        console.log('✅ QR EMV generado:', {
            length: qrString.length,
            crc: crcHex,
        });

        return qrString;
    } catch (error) {
        console.error('❌ Error generando QR EMV:', error);
        throw new Error(`Error generando QR EMV: ${error.message}`);
    }
}

// Función básica de validación
export function validateEMVQR(qrString) {
    try {
        // Verificaciones básicas
        if (!qrString || qrString.length < 20) {
            return { valid: false, errors: ['QR muy corto'] };
        }

        // Verificar que comience con formato correcto
        if (!qrString.startsWith('0001')) {
            return { valid: false, errors: ['Formato de payload incorrecto'] };
        }

        // Verificar CRC básico
        const crcPart = qrString.slice(-4);
        const qrWithoutCRC = qrString.slice(0, -4) + '6304';
        const calculatedCRC = calculateCRC16(qrWithoutCRC);
        const expectedCRC = calculatedCRC
            .toString(16)
            .toUpperCase()
            .padStart(4, '0');

        if (crcPart !== expectedCRC) {
            return {
                valid: false,
                errors: [
                    `CRC inválido. Esperado: ${expectedCRC}, Actual: ${crcPart}`,
                ],
            };
        }

        return {
            valid: true,
            errors: [],
            warnings: [],
            length: qrString.length,
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`Error de validación: ${error.message}`],
        };
    }
}

// Función de parsing básico
export function parseEMVQR(qrString) {
    try {
        const parsed = {};
        let position = 0;

        while (position < qrString.length - 4) {
            if (position + 4 > qrString.length) break;

            const tag = qrString.substr(position, 2);
            const length = parseInt(qrString.substr(position + 2, 2), 10);

            if (position + 4 + length > qrString.length) break;

            const value = qrString.substr(position + 4, length);
            parsed[tag] = value;

            position += 4 + length;
        }

        return { success: true, data: parsed };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
