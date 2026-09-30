'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    const isLocalHost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
      || hostname.endsWith('.localhost');
    if (process.env.NODE_ENV !== 'production' || isLocalHost) return;

    let visitorId: string;
    try {
      const storedVisitorId = window.localStorage.getItem('bmf-visitor-id');
      visitorId = storedVisitorId ?? window.crypto.randomUUID();
      if (!storedVisitorId) window.localStorage.setItem('bmf-visitor-id', visitorId);
    } catch {
      return;
    }

    const trackVisit = () => {
      void fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    };

    trackVisit();
    const intervalId = window.setInterval(trackVisit, 60_000);
    return () => window.clearInterval(intervalId);
  }, [pathname]);

  return null;
}
