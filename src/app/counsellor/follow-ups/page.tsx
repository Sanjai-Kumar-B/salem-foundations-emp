'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FollowUpsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/counsellor/todays-calls');
    }, [router]);

    return null;
}
