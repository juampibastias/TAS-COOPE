import { useState, useEffect } from 'react';
import { fetchFacturas } from '../services/facturaService';
import { clearPolling } from '../services/modoPollingService';
import { createRoute } from '../utils/routeHelper';

export function useTASFacturas() {
    const [facturas, setFacturas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [nis, setNis] = useState('');

    useEffect(() => {
        const storedNis =
            localStorage?.getItem?.('nis') ||
            new URLSearchParams(window.location.search).get('nis');

        if (!storedNis) {
            setError('NIS no encontrado');
            setCargando(false);
            return;
        }

        setNis(storedNis);
        loadFacturas(storedNis);

        // Cleanup para polling al desmontar componente
        return () => clearPolling();
    }, []);

    const loadFacturas = async (nisValue) => {
        try {
            setCargando(true);
            const data = await fetchFacturas(nisValue);
            setFacturas(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const volverAlInicio = () => {
        // Limpiar polling si está activo
        clearPolling();
    
        if (typeof window !== 'undefined' && localStorage) {
            localStorage.removeItem('nis');
            localStorage.removeItem('nis_timestamp');
        }
        window.location.href = createRoute('/');
    };

    // Funciones auxiliares para calcular datos derivados
    const getFacturasImpagas = () => {
        return facturas.filter((f) => f.ESTADO !== 'PAGADA');
    };

    const getTotalDeuda = () => {
        const facturasImpagas = getFacturasImpagas();
        return facturasImpagas.reduce(
            (sum, f) => sum + parseFloat(f.SALDO || 0),
            0
        );
    };

    const getProximaFactura = () => {
        const facturasImpagas = getFacturasImpagas();
        return facturasImpagas.sort(
            (a, b) => new Date(a.CTA1_VTO) - new Date(b.CTA1_VTO)
        )[0];
    };

    const getCliente = () => {
        return facturas.length > 0 ? facturas[0] : null;
    };

    return {
        // Estados principales
        facturas,
        cargando,
        error,
        nis,

        // Datos derivados
        facturasImpagas: getFacturasImpagas(),
        totalDeuda: getTotalDeuda(),
        proximaFactura: getProximaFactura(),
        cliente: getCliente(),

        // Acciones
        volverAlInicio,
        refetchFacturas: () => loadFacturas(nis),
    };
}
