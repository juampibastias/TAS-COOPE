'use client';

import { Suspense } from 'react';
import TASLoading from './TASLoading';
import TASEstadoCuentaContent from './TASEstadoCuentaContent';

export default function TASEstadoCuentaPage() {
    return (
        <Suspense fallback={<TASLoading />}>
            <TASEstadoCuentaContent />
        </Suspense>
    );
}
