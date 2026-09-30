'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient, getAccessToken } from '@/lib/supabase/client';

const navigation = [
  { href: '/admin', label: 'Analytics', icon: '▦' },
  { href: '/admin/orders', label: 'Commandes', icon: '▤' },
  { href: '/admin/catalog', label: 'Catalogue', icon: '◇' },
  { href: '/admin/payments', label: 'Paiements QR', icon: '◈' },
  { href: '/admin/events', label: 'Événements IA', icon: '✦' },
];

const pageLabels: Record<string, string> = {
  '/admin': 'Analytics',
  '/admin/orders': 'Commandes',
  '/admin/catalog': 'Catalogue',
  '/admin/payments': 'Paiements QR',
  '/admin/events': 'Événements IA',
};

export default function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [signingOut, setSigningOut] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          router.replace('/login');
          return;
        }

        const response = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!response.ok) {
          router.replace(response.status === 403 ? '/topup' : '/login');
          return;
        }

        const data = await response.json();
        if (data.role !== 'admin') {
          router.replace('/topup');
          return;
        }

        if (active) setAuthorized(true);
      } catch {
        router.replace('/login');
      }
    };

    void verifyAdmin();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    const client = createSupabaseClient();
    if (client) await client.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (!authorized) {
    return <main className="min-h-screen bg-slate-950 p-8 text-center text-slate-300">Vérification des accès…</main>;
  }

  return (
    <div className="admin-app" data-theme={theme}>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <Image src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png" alt="BMF Top Up" width={1320} height={1192} className="admin-brand-logo" />
        </Link>

        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav" aria-label="Navigation administration">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`admin-nav-link${active ? ' is-active' : ''}`}>
                <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-spacer" />
        <div className="admin-sidebar-divider" />
        <Link href="/" className="admin-nav-link admin-site-link">
          <span className="admin-nav-icon" aria-hidden="true">↗</span>
          <span>Voir le site</span>
        </Link>
        <button type="button" aria-label="Déconnexion" title="Déconnexion" onClick={() => void handleSignOut()} disabled={signingOut} className="admin-nav-link admin-signout">
          <span className="admin-nav-icon" aria-hidden="true">⇥</span>
          <span>{signingOut ? 'Déconnexion…' : 'Déconnexion'}</span>
        </button>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-breadcrumb"><span>Administration</span><span aria-hidden="true">/</span><strong>{pageLabels[pathname] ?? 'Administration'}</strong></div>
          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-theme-toggle"
              aria-label={theme === 'light' ? 'Activer le thème sombre' : 'Activer le thème clair'}
              title={theme === 'light' ? 'Thème sombre' : 'Thème clair'}
              onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
            >
              <span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
              <span>{theme === 'light' ? 'Clair' : 'Sombre'}</span>
            </button>
            <div className="admin-user-chip">
              <span className="admin-user-avatar">B</span>
              <span className="admin-user-copy"><strong>Administrateur</strong><small>Espace sécurisé</small></span>
            </div>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
