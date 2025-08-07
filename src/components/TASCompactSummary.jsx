export default function TASCompactSummary({
    cliente,
    nis,
    totalDeuda,
    proximaFactura,
}) {
    if (!cliente) return null;

    return (
        <div className='mb-6'>
            {/* Header con información del cliente */}
            <div className='grid grid-cols-2 gap-4'>
                {/* Información del Cliente */}
                <div className='bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30'>
                    <h3 className='text-emerald-200 text-xl uppercase tracking-wide mb-1'>
                        CLIENTE
                    </h3>
                    <p className='text-white text-lg font-bold leading-tight'>
                        {cliente.NOMBRE}
                    </p>
                    <p className='text-emerald-200 text-xl mt-1'>NIS: {nis}</p>
                </div>

                {/* Deuda Total */}
                <div className='bg-red-500/30 backdrop-blur-sm rounded-2xl p-4 border border-red-400/50'>
                    <h3 className='text-red-200 text-xl uppercase tracking-wide mb-1'>
                        DEUDA TOTAL
                    </h3>
                    <p className='text-white text-3xl font-bold'>
                        ${totalDeuda.toLocaleString()}
                    </p>
                </div>

                {/* Próximo Vencimiento */}
                {/* <div className='bg-orange-500/30 backdrop-blur-sm rounded-2xl p-4 border border-orange-400/50'>
                    <h3 className='text-orange-200 text-xl uppercase tracking-wide mb-1'>
                        PRÓXIMO VENCIMIENTO
                    </h3>
                    {proximaFactura ? (
                        <>
                            <p className='text-white text-xl font-bold'>
                                {proximaFactura.CTA1_VTO}
                            </p>
                            <p className='text-orange-200 text-lg'>
                                $
                                {parseFloat(
                                    proximaFactura.SALDO || 0
                                ).toLocaleString()}
                            </p>
                        </>
                    ) : (
                        <p className='text-white text-lg font-bold'>
                            Sin pendientes
                        </p>
                    )}
                </div> */}
            </div>
        </div>
    );
}
