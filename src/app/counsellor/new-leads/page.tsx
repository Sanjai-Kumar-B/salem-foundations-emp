'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewLeadsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/counsellor/workspace');
    }, [router]);

    return null;
}
