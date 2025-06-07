// Función para parsear fechas en formato DD/MM/YYYY
export const parseDate = (dateString) => {
    try {
        const parts = dateString.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Los meses en JS van de 0-11
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    } catch (error) {
        console.error('Error al parsear fecha:', dateString, error);
        return new Date(); // Retorna fecha actual como fallback
    }
};

// Función para formatear fechas en formato DD-MM-YYYY
export const formatDate = (date) => {
    try {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error al formatear fecha:', date, error);
        return '';
    }
};

// Función para formatear fechas en formato DD/MM/YYYY
export const formatDateSlash = (date) => {
    try {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error al formatear fecha:', date, error);
        return '';
    }
};

// Función para verificar si una fecha está vencida
export const isVencido = (fechaString) => {
    try {
        const [day, month, year] = fechaString.split('/');
        const fecha = new Date(year, month - 1, day);
        const hoy = new Date();

        // Comparar solo fechas (sin hora)
        fecha.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        return fecha < hoy;
    } catch (error) {
        console.error('Error al verificar vencimiento:', fechaString, error);
        return false;
    }
};

// Función para calcular días hasta el vencimiento
export const getDiasVencimiento = (fechaString) => {
    try {
        const [day, month, year] = fechaString.split('/');
        const fecha = new Date(year, month - 1, day);
        const hoy = new Date();

        fecha.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        const diffTime = fecha - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    } catch (error) {
        console.error(
            'Error al calcular días de vencimiento:',
            fechaString,
            error
        );
        return 0;
    }
};

// Función para obtener el estado de una fecha (vencido, por vencer, vigente)
export const getEstadoFecha = (fechaString, diasAlerta = 7) => {
    const dias = getDiasVencimiento(fechaString);

    if (dias < 0) {
        return {
            estado: 'vencido',
            dias: Math.abs(dias),
            color: 'red',
            icon: '⚠️',
            mensaje: `Vencido hace ${Math.abs(dias)} días`,
        };
    } else if (dias <= diasAlerta) {
        return {
            estado: 'por-vencer',
            dias,
            color: 'orange',
            icon: '⏰',
            mensaje: dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`,
        };
    } else {
        return {
            estado: 'vigente',
            dias,
            color: 'green',
            icon: '✅',
            mensaje: `Vigente (${dias} días)`,
        };
    }
};

// Función para formatear fechas de manera amigable
export const formatDateFriendly = (fechaString) => {
    try {
        const fecha = parseDate(fechaString);
        const hoy = new Date();

        // Si es hoy
        if (formatDateSlash(fecha) === formatDateSlash(hoy)) {
            return 'Hoy';
        }

        // Si es mañana
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);
        if (formatDateSlash(fecha) === formatDateSlash(manana)) {
            return 'Mañana';
        }

        // Si es ayer
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);
        if (formatDateSlash(fecha) === formatDateSlash(ayer)) {
            return 'Ayer';
        }

        // Para otras fechas, mostrar el día de la semana si está en la misma semana
        const dias = getDiasVencimiento(fechaString);
        if (Math.abs(dias) <= 7) {
            const diasSemana = [
                'Domingo',
                'Lunes',
                'Martes',
                'Miércoles',
                'Jueves',
                'Viernes',
                'Sábado',
            ];
            return diasSemana[fecha.getDay()];
        }

        // Para fechas más lejanas, mostrar la fecha completa
        return fechaString;
    } catch (error) {
        console.error('Error al formatear fecha amigable:', fechaString, error);
        return fechaString;
    }
};

// Función para obtener el mes en texto
export const getMonthName = (monthNumber) => {
    const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
    ];
    return meses[monthNumber - 1] || 'Mes desconocido';
};

// Función para validar formato de fecha DD/MM/YYYY
export const isValidDateFormat = (fechaString) => {
    const regex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!regex.test(fechaString)) {
        return false;
    }

    try {
        const fecha = parseDate(fechaString);
        return !isNaN(fecha.getTime());
    } catch {
        return false;
    }
};

// Función para crear timestamp para almacenamiento
export const createTimestamp = () => {
    return new Date().toISOString();
};

// Función para comparar fechas
export const compareDates = (fecha1String, fecha2String) => {
    try {
        const fecha1 = parseDate(fecha1String);
        const fecha2 = parseDate(fecha2String);

        if (fecha1 < fecha2) return -1;
        if (fecha1 > fecha2) return 1;
        return 0;
    } catch (error) {
        console.error('Error al comparar fechas:', error);
        return 0;
    }
};
