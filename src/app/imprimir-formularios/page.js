'use client';
import { useState, useEffect } from 'react';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import { createRoute } from '../../utils/routeHelper';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ImprimirFormulariosPage() {
    const [formularioSeleccionado, setFormularioSeleccionado] = useState(null);
    const [modoSuspendido, setModoSuspendido] = useState(false);
    const [cargandoPreview, setCargandoPreview] = useState(false);
    const [errorPreview, setErrorPreview] = useState('');
    const [formularios, setFormularios] = useState([]);
    const [cargandoFormularios, setCargandoFormularios] = useState(true);
    const [errorFormularios, setErrorFormularios] = useState('');

    // 📋 Fetch formularios desde el backend
    useEffect(() => {
        async function fetchFormularios() {
            try {
                setCargandoFormularios(true);
                const res = await fetch(`${baseUrl}/api/formularios-imprimir`);

                if (!res.ok) {
                    throw new Error('Error al obtener formularios');
                }

                const data = await res.json();

                const items = data.map((item) => {
                    try {
                        // Convertir contenido Quill a HTML si existe
                        let descripcionHtml = item.descripcion;
                        if (
                            item.descripcion &&
                            typeof item.descripcion === 'object' &&
                            item.descripcion.ops
                        ) {
                            const converter = new QuillDeltaToHtmlConverter(
                                item.descripcion.ops,
                                {}
                            );
                            descripcionHtml = converter.convert();
                        }

                        return {
                            ...item,
                            descripcionHtml: descripcionHtml,
                        };
                    } catch (error) {
                        console.error('Error convirtiendo Quill:', error);
                        return {
                            ...item,
                            descripcionHtml:
                                item.descripcion ||
                                'Sin descripción disponible',
                        };
                    }
                });

                setFormularios(items);
                console.log('✅ Formularios cargados:', items);
            } catch (error) {
                console.error('❌ Error al traer formularios:', error);
                setErrorFormularios(
                    'Error al cargar formularios. Intente nuevamente.'
                );
            } finally {
                setCargandoFormularios(false);
            }
        }

        fetchFormularios();
    }, []);

    // ⏱ Inactividad -> volver al home
    useEffect(() => {
        let inactividadTimer;

        const resetInactividad = () => {
            clearTimeout(inactividadTimer);
            inactividadTimer = setTimeout(() => {
                window.location.href = '/';
            }, 3 * 60 * 1000); // 3 minutos de inactividad
        };

        const handleUserInteraction = () => {
            resetInactividad();
        };

        window.addEventListener('mousedown', handleUserInteraction);
        window.addEventListener('touchstart', handleUserInteraction);
        window.addEventListener('keydown', handleUserInteraction);

        resetInactividad();

        return () => {
            window.removeEventListener('mousedown', handleUserInteraction);
            window.removeEventListener('touchstart', handleUserInteraction);
            window.removeEventListener('keydown', handleUserInteraction);
            clearTimeout(inactividadTimer);
        };
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (formularioSeleccionado) {
                    // Si hay formulario seleccionado, cerrar preview
                    setFormularioSeleccionado(null);
                } else {
                    // Si no hay formulario seleccionado, volver al home
                    window.location.href = '/';
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [formularioSeleccionado]);

    const volverAlHome = () => {
        window.location.href = createRoute('/');
    };

    const seleccionarFormulario = async (formulario) => {
        setCargandoPreview(true);
        setErrorPreview('');
        setFormularioSeleccionado(formulario);

        // Simular carga del preview
        setTimeout(() => {
            setCargandoPreview(false);
        }, 1000);
    };

    const cerrarPreview = () => {
        setFormularioSeleccionado(null);
        setErrorPreview('');
    };

    const imprimirFormulario = () => {
        if (!formularioSeleccionado) return;

        try {
            // Abrir el PDF en una nueva ventana optimizada para impresión
            const printWindow = window.open(
                formularioSeleccionado.url,
                '_blank',
                'width=800,height=600,scrollbars=yes,resizable=yes'
            );

            // Intentar activar impresión automática después de cargar
            if (printWindow) {
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 1000);
                };
            }

            // Alerta de confirmación
            setTimeout(() => {
                alert(
                    '📄 Formulario enviado a impresora.\n\nSi no se abrió automáticamente, use Ctrl+P en la ventana del documento.'
                );
            }, 500);
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('❌ Error al abrir el formulario para impresión.');
        }
    };

    // Agrupar formularios por categoría
    const categorias =
        formularios.length > 0
            ? [...new Set(formularios.map((f) => f.categoria))]
            : [];

    // Mostrar estado de carga o error si no hay formularios
    if (cargandoFormularios) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex items-center justify-center'>
                <div className='text-center'>
                    <div className='inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4'></div>
                    <h2 className='text-2xl font-bold mb-2'>
                        Cargando formularios...
                    </h2>
                    <p className='text-green-200'>
                        Obteniendo lista actualizada desde el servidor
                    </p>
                </div>
            </div>
        );
    }

    if (errorFormularios) {
        return (
            <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex items-center justify-center'>
                <div className='text-center max-w-md'>
                    <div className='text-6xl mb-4'>⚠️</div>
                    <h2 className='text-3xl font-bold mb-4 text-red-300'>
                        Error de conexión
                    </h2>
                    <p className='text-xl mb-6 text-red-200'>
                        {errorFormularios}
                    </p>
                    <div className='space-y-3'>
                        <button
                            onClick={() => window.location.reload()}
                            className='block w-full px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-colors'
                        >
                            🔄 REINTENTAR
                        </button>
                        <button
                            onClick={() => (window.location.href = '/')}
                            className='block w-full px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold transition-colors'
                        >
                            ← VOLVER AL INICIO
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 text-white flex flex-col'>
            {/* HEADER - Usando los colores exactos de tu CSS */}
            <div
                className='p-6 shadow-lg'
                style={{
                    background: '#00983f',
                    background:
                        'linear-gradient(87deg, #00983f 0%, #78bc1b 38%, #b4ce09 67%, #ccd502 100%)',
                }}
            >
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <button
                            onClick={volverAlHome}
                            className='bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-white font-bold transition-colors text-sm flex items-center gap-2'
                        >
                            ← VOLVER
                        </button>
                        <img
                            src='/LOGO.png'
                            alt='Logo Cooperativa'
                            className='h-12 w-auto object-contain'
                        />
                    </div>
                    <div className='text-center'>
                        <h1 className='text-2xl font-bold text-white'>
                            🖨️ IMPRIMIR FORMULARIOS
                        </h1>
                        <p className='text-white/90 text-sm'>
                            Seleccione el formulario que desea imprimir
                        </p>
                    </div>
                    <div className='text-right text-sm text-white/80'>
                        <div>{new Date().toLocaleDateString()}</div>
                        <div>{new Date().toLocaleTimeString()}</div>
                    </div>
                </div>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            <div className='flex-1 flex'>
                {/* LISTA DE FORMULARIOS */}
                <div className='w-1/2 p-6 bg-green-800/30 overflow-y-auto'>
                    <h2
                        className='text-2xl font-bold mb-6 text-center'
                        style={{ color: '#78bc1b' }}
                    >
                        FORMULARIOS DISPONIBLES
                    </h2>

                    {formularios.length === 0 ? (
                        <div className='h-full flex items-center justify-center'>
                            <div className='text-center'>
                                <div
                                    className='text-8xl mb-6'
                                    style={{ color: '#78bc1b' }}
                                >
                                    📋
                                </div>
                                <h3
                                    className='text-2xl font-bold mb-4'
                                    style={{ color: '#ccd502' }}
                                >
                                    No hay formularios disponibles
                                </h3>
                                <p className='text-green-200 text-lg'>
                                    Los formularios se están configurando.
                                    <br />
                                    Intente nuevamente más tarde.
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className='mt-4 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold transition-colors'
                                >
                                    🔄 ACTUALIZAR
                                </button>
                            </div>
                        </div>
                    ) : (
                        categorias.map((categoria) => (
                            <div key={categoria} className='mb-6'>
                                <h3
                                    className='text-lg font-bold mb-3 border-b pb-1'
                                    style={{
                                        color: '#b4ce09',
                                        borderColor: '#78bc1b',
                                    }}
                                >
                                    📁 {categoria}
                                </h3>

                                <div className='space-y-3'>
                                    {formularios
                                        .filter(
                                            (f) => f.categoria === categoria
                                        )
                                        .map((formulario) => (
                                            <button
                                                key={formulario.id}
                                                onClick={() =>
                                                    seleccionarFormulario(
                                                        formulario
                                                    )
                                                }
                                                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-300 ${
                                                    formularioSeleccionado?.id ===
                                                    formulario.id
                                                        ? 'shadow-xl'
                                                        : 'hover:bg-green-700/50'
                                                }`}
                                                style={{
                                                    borderColor:
                                                        formularioSeleccionado?.id ===
                                                        formulario.id
                                                            ? '#b4ce09'
                                                            : '#00983f',
                                                    backgroundColor:
                                                        formularioSeleccionado?.id ===
                                                        formulario.id
                                                            ? 'rgba(120, 188, 27, 0.2)'
                                                            : 'rgba(0, 152, 63, 0.1)',
                                                }}
                                            >
                                                <h4
                                                    className='font-bold mb-1'
                                                    style={{ color: '#ccd502' }}
                                                >
                                                    📄{' '}
                                                    {formulario.titulo ||
                                                        formulario.title}
                                                </h4>
                                                <div
                                                    className='text-sm text-green-200'
                                                    dangerouslySetInnerHTML={{
                                                        __html:
                                                            formulario.descripcionHtml ||
                                                            formulario.descripcion ||
                                                            'Sin descripción',
                                                    }}
                                                />
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* PREVIEW Y CONTROLES */}
                <div className='w-1/2 p-6'>
                    {formularioSeleccionado ? (
                        <div className='h-full flex flex-col'>
                            {/* Header del preview */}
                            <div
                                className='p-4 rounded-t-lg border-2'
                                style={{
                                    backgroundColor: 'rgba(0, 152, 63, 0.3)',
                                    borderColor: '#78bc1b',
                                }}
                            >
                                <div className='flex justify-between items-center'>
                                    <div>
                                        <h3
                                            className='text-xl font-bold'
                                            style={{ color: '#ccd502' }}
                                        >
                                            {formularioSeleccionado.titulo ||
                                                formularioSeleccionado.title}
                                        </h3>
                                        <div
                                            className='text-sm text-green-200'
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    formularioSeleccionado.descripcionHtml ||
                                                    formularioSeleccionado.descripcion ||
                                                    '',
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={cerrarPreview}
                                        className='bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-white font-bold transition-colors text-sm'
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Área de preview */}
                            <div
                                className='flex-1 border-2 border-t-0 rounded-b-lg p-4 flex items-center justify-center'
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderColor: '#78bc1b',
                                }}
                            >
                                {cargandoPreview ? (
                                    <div className='text-center'>
                                        <div
                                            className='inline-block animate-spin rounded-full h-12 w-12 border-b-4 mb-4'
                                            style={{
                                                borderColor: '#b4ce09',
                                            }}
                                        ></div>
                                        <p style={{ color: '#ccd502' }}>
                                            Cargando vista previa...
                                        </p>
                                    </div>
                                ) : (
                                    <div className='text-center'>
                                        <div className='text-6xl mb-4'>📄</div>
                                        <h4
                                            className='text-xl font-bold mb-2'
                                            style={{ color: '#ccd502' }}
                                        >
                                            Vista previa del documento
                                        </h4>
                                        <p className='text-green-200 mb-6'>
                                            {formularioSeleccionado.titulo ||
                                                formularioSeleccionado.title}
                                        </p>

                                        {/* Iframe para mostrar el PDF */}
                                        <div className='bg-white rounded-lg p-2 mb-6 max-w-md mx-auto'>
                                            <iframe
                                                src={`${formularioSeleccionado.url}#toolbar=0&navpanes=0&scrollbar=0`}
                                                className='w-full h-64 rounded'
                                                title='Vista previa del formulario'
                                                onError={() =>
                                                    setErrorPreview(
                                                        'No se pudo cargar la vista previa'
                                                    )
                                                }
                                            />
                                        </div>

                                        <button
                                            onClick={imprimirFormulario}
                                            className='px-8 py-4 rounded-xl text-white text-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-3 mx-auto'
                                            style={{
                                                background:
                                                    'linear-gradient(87deg, #00983f 0%, #78bc1b 38%, #b4ce09 67%, #ccd502 100%)',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background =
                                                    'linear-gradient(87deg, #78bc1b 0%, #b4ce09 38%, #ccd502 67%, #00983f 100%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background =
                                                    'linear-gradient(87deg, #00983f 0%, #78bc1b 38%, #b4ce09 67%, #ccd502 100%)';
                                            }}
                                        >
                                            🖨️ IMPRIMIR FORMULARIO
                                        </button>
                                    </div>
                                )}

                                {errorPreview && (
                                    <div className='text-center'>
                                        <div className='text-6xl mb-4 text-red-400'>
                                            ⚠️
                                        </div>
                                        <p className='text-red-300 mb-4'>
                                            {errorPreview}
                                        </p>
                                        <button
                                            onClick={imprimirFormulario}
                                            className='px-6 py-3 rounded-lg text-white font-bold transition-colors'
                                            style={{
                                                backgroundColor: '#00983f',
                                            }}
                                        >
                                            🖨️ IMPRIMIR DE TODAS FORMAS
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className='h-full flex items-center justify-center'>
                            <div className='text-center'>
                                <div
                                    className='text-8xl mb-6'
                                    style={{ color: '#78bc1b' }}
                                >
                                    📋
                                </div>
                                <h3
                                    className='text-2xl font-bold mb-4'
                                    style={{ color: '#ccd502' }}
                                >
                                    Seleccione un formulario
                                </h3>
                                <p className='text-green-200 text-lg'>
                                    Haga clic en cualquier formulario de la
                                    lista
                                    <br />
                                    para ver la vista previa e imprimir
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER */}
            <div
                className='p-4 text-center text-green-200 text-sm'
                style={{ backgroundColor: '#00983f' }}
            >
                <div className='flex justify-between items-center max-w-6xl mx-auto'>
                    <span></span>
                    <span>🔒 Conexión segura</span>
                    <span></span>
                </div>
            </div>
        </div>
    );
}
