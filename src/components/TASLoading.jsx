export default function TASLoading({
    message = 'Cargando estado de cuenta...',
}) {
    return (
        <div className='fixed inset-0 bg-gradient-to-br from-green-900 via-green-800 to-lime-700 flex items-center justify-center text-white'>
            <div className='text-center'>
                <div className='inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4'></div>
                <p className='text-2xl font-bold'>{message}</p>
            </div>
        </div>
    );
}
