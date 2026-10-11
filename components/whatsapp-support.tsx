'use client';

import { usePathname } from 'next/navigation';

const supportNumber = (process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT ?? '').replace(/\D/g, '');

export function WhatsAppSupport({ message = 'Bonjour BMF, j’ai besoin d’aide.' }: { message?: string }) {
  const pathname = usePathname();
  if (!supportNumber || pathname.startsWith('/admin')) return null;

  return (
    <a
      href={`https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter le support BMF sur WhatsApp"
      className="whatsapp-float fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-slate-950 shadow-lg shadow-black/40 transition hover:bg-[#20bd5a]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.1L2 22l5.05-1.6A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.45 1.35-2 1.4-.52.05-1.15.07-1.85-.12a11.6 11.6 0 0 1-4.9-2.9c-1.5-1.5-2.4-3.3-2.5-3.9-.1-.6.5-1.7 1.2-1.9.3-.1.6 0 .8.5l.8 1.9c.1.3 0 .5-.1.7l-.5.6c-.1.2-.2.3 0 .6a8 8 0 0 0 3.2 3c.4.2.6.2.8 0l.7-.9c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.6.3.1.2.1.8-.1 1.4Z" />
      </svg>
    </a>
  );
}
