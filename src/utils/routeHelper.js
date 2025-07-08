export const getBasePath = () => {
    return process.env.NODE_ENV === 'production' ? '/tas-coope' : '';
};

export const createRoute = (path) => {
    const basePath = getBasePath();
    // Asegurar que el path comience con /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${cleanPath}`;
};