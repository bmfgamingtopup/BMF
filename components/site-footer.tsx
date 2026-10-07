import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer mt-auto">
      <div className="page-shell py-8">
        <div className="grid gap-8 pb-8 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div>
            <div className="font-semibold tracking-[0.2em] text-violet-300">BMF</div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              Marketplace premium pour recharges, cartes cadeaux et services gaming, pensé pour des joueurs exigeants.
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Service</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><Link href="/topup" className="transition hover:text-white">Recharges</Link></li>
              <li><Link href="/giftcards" className="transition hover:text-white">Cartes cadeaux</Link></li>
              <li><Link href="/faq" className="transition hover:text-white">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Légal</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li><Link href="/cgu" className="transition hover:text-white">Conditions générales (CGU)</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 BMF — Gaming marketplace</div>
          <nav className="flex items-center gap-4" aria-label="Liens de pied de page">
            <Link href="/faq" className="transition hover:text-white">FAQ</Link>
            <Link href="/cgu" className="transition hover:text-white">CGU</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
