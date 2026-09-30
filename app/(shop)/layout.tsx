'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/supabase/client';

export default function ShopLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [access, setAccess] = useState<'checking' | 'allowed' | 'unavailable'>('checking');

  useEffect(() => {
    let active = true;

    const verifyCustomer = async () => {
      const accessToken = await getAccessToken();
      if (!active) return;

      if (!accessToken) {
        setAccess('allowed');
        return;
      }

      try {
        const response = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!response.ok) {
          setAccess('unavailable');
          return;
        }

        const data = await response.json();
        if (data.role === 'admin') {
          router.replace('/admin');
          return;
        }
        if (data.role !== 'customer') {
          setAccess('unavailable');
          return;
        }

        setAccess('allowed');
      } catch {
        setAccess('unavailable');
      }
    };

    void verifyCustomer();
    return () => {
      active = false;
    };
  }, [router]);

  if (access === 'checking') {
    return <main className="min-h-screen bg-slate-950 p-8 text-center text-slate-300">Vérification des accès…</main>;
  }
  if (access === 'unavailable') {
    return <main className="min-h-screen bg-slate-950 p-8 text-center text-slate-300">Impossible de vérifier le compte. Connectez-vous à nouveau.</main>;
  }

  return children;
}