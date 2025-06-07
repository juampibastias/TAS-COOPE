export default function TASCompactSummary({
    cliente,
    nis,
    totalDeuda,
    proximaFactura,
}) {
    if (!cliente) return null;

    return (
        <div className='mb-2'>
            {/* Fila superior: Cliente y NIS más compactos */}
            <div className='grid grid-cols-2 gap-2 mb-2'>
                <div className='bg-green-800/50 p-2 rounded-lg'>
                    <p className='text-green-200 text-[10px] uppercase'>
                        CLIENTE:
                    </p>
                    <p className='text-xs font-bold truncate'>
                        {cliente.NOMBRE}
                    </p>
                </div>
                <div className='bg-green-800/50 p-2 rounded-lg text-right'>
                    <p className='text-green-200 text-[10px] uppercase'>NIS:</p>
                    <p className='text-xs font-bold font-mono'>{nis}</p>
                </div>
            </div>

            {/* Fila inferior: Deuda y Próximo vencimiento */}
            <div className='grid grid-cols-2 gap-2'>
                <div className='bg-red-900/40 border border-red-500 p-2 rounded text-center'>
                    <p className='text-red-200 text-[10px] uppercase'>
                        DEUDA TOTAL
                    </p>
                    <p className='text-sm font-bold text-red-100'>
                        ${totalDeuda.toLocaleString()}
                    </p>
                </div>

                <div className='bg-orange-900/40 border border-orange-500 p-2 rounded text-center'>
                    <p className='text-orange-200 text-[10px] uppercase'>
                        PRÓXIMO VENC.
                    </p>
                    {proximaFactura ? (
                        <>
                            <p className='text-xs font-bold text-orange-100'>
                                {proximaFactura.CTA1_VTO}
                            </p>
                            <p className='text-[10px] text-orange-200'>
                                $
                                {parseFloat(
                                    proximaFactura.SALDO || 0
                                ).toLocaleString()}
                            </p>
                        </>
                    ) : (
                        <p className='text-[10px] text-orange-200'>
                            Sin pendientes
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
