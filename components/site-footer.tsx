import Image from 'next/image';
import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="site-footer mt-auto">
      <div className="page-shell py-10 sm:py-12">
        <div className="grid gap-10 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
          <div className="max-w-sm">
            <Link href="/" aria-label="BMF Top Up, accueil" className="inline-flex items-center gap-3">
              <Image
                src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png"
                alt=""
                width={1320}
                height={1192}
                className="h-11 w-11 object-contain"
              />
              <span className="text-base font-bold text-white">BMF Top Up</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Recharges Free Fire et cartes cadeaux numériques, simplement.
            </p>
          </div>

          <nav aria-label="Découvrir BMF">
            <h2 className="text-sm font-semibold text-white">Découvrir</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li><Link href="/topup" className="transition-colors hover:text-white">Recharges</Link></li>
              <li><Link href="/giftcards" className="transition-colors hover:text-white">Cartes cadeaux</Link></li>
              <li><Link href="/login" className="transition-colors hover:text-white">Connexion</Link></li>
            </ul>
          </nav>

          <nav aria-label="Aide et informations légales">
            <h2 className="text-sm font-semibold text-white">Aide et informations</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              <li><Link href="/faq" className="transition-colors hover:text-white">Questions fréquentes</Link></li>
              <li><Link href="/cgu" className="transition-colors hover:text-white">Conditions générales</Link></li>
            </ul>
          </nav>
        </div>

        <p className="pt-5 text-xs text-slate-500">© 2026 BMF Top Up. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
