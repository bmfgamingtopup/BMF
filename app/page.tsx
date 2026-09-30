import Link from 'next/link';
import Image from 'next/image';
import { connection } from 'next/server';
import { fetchCatalogData } from '@/lib/data';

export default async function HomePage() {
  await connection();
  const { aiEvents, giftCards, revenueStats, topUpPacks } = await fetchCatalogData();
  const publishedEventCount = aiEvents.filter((event) => event.status === 'published').length;
  return (
    <main className="min-h-screen text-slate-100">
      <div className="landing-hero">
        <div className="landing-art" aria-hidden="true" />
        <div className="landing-eclipse" aria-hidden="true" />
        <div className="landing-fire" aria-hidden="true" />
        <header className="page-shell relative z-10 flex flex-wrap items-center justify-between gap-3 py-4">
        <Link href="/" aria-label="BMF Top Up, accueil" className="flex items-center">
          <Image src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png" alt="BMF Top Up" width={1320} height={1192} priority className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 md:flex">
          <Link href="/topup" className="transition hover:text-white">Recharges</Link>
          <Link href="/giftcards" className="transition hover:text-white">Gift Card</Link>
          <Link href="/login" className="transition hover:text-white">Connexion</Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link href="/login" className="secondary-btn px-3 py-2 text-xs sm:px-4 sm:text-sm">
            Se connecter
          </Link>
          <Link href="/register" className="primary-btn px-3 py-2 text-xs sm:px-4 sm:text-sm">
            Créer un compte
          </Link>
        </div>
        </header>

      <section className="page-shell relative z-10 flex min-h-[calc(100svh-4rem)] items-center pb-10 pt-4 lg:pb-12 lg:pt-6">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="game-reveal game-reveal-delay-1 inline-flex items-center gap-3 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
              <span className="game-status-dot h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,0.9)]" />
              Premium gaming marketplace
            </div>

            <div className="game-reveal game-reveal-delay-2 space-y-4">
              <h1 className="hero-heading max-w-2xl">
                TOP-UP premium et contenus gaming en quelques secondes.
              </h1>
              <p className="hero-copy max-w-xl">
                BMF centralise les recharges, cartes cadeaux et produits gaming avec un service premium, ultra rapide et pensé pour des joueurs exigeants.
              </p>
            </div>

            <div className="game-reveal game-reveal-delay-3 flex flex-wrap gap-3">
              <Link href="/topup" className="primary-btn">
                Acheter maintenant
              </Link>
              <Link href="/giftcards" className="secondary-btn">
                Explorer les cartes
              </Link>
            </div>

            {revenueStats.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-white/10 py-4 xl:grid-cols-4">
                {revenueStats.map((stat) => (
                  <div key={stat.label} className="border-l border-white/10 pl-3">
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-l border-white/15 py-1 pl-3 text-sm text-slate-400">
                Les métriques de production seront affichées une fois la base de données connectée.
              </div>
            )}
          </div>

          <div className="game-reveal game-reveal-delay-4 border-y border-white/10 py-5 lg:pl-8">
            <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <span>Catalogue</span>
              <span>{topUpPacks.length + giftCards.length} offres</span>
            </div>
            <div className="divide-y divide-white/10">
              <div className="flex items-center justify-between py-3 text-sm text-slate-300">
                <span>Packs de recharge</span>
                <span className="font-semibold text-violet-200">{topUpPacks.length}</span>
              </div>
              <div className="flex items-center justify-between py-3 text-sm text-slate-300">
                <span>Cartes cadeaux</span>
                <span className="font-semibold text-cyan-200">{giftCards.length}</span>
              </div>
              <div className="flex items-center justify-between py-3 text-sm text-slate-300">
                <span>Articles publiés</span>
                <span className="font-semibold text-amber-200">{publishedEventCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      <section className="page-shell py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Boutique</p>
            <h2 className="section-heading mt-2">Recharges exclusives</h2>
          </div>
          <Link href="/topup" className="text-sm font-semibold text-violet-300 hover:text-violet-200">
            Voir tout →
          </Link>
        </div>

        {topUpPacks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {topUpPacks.map((pack) => (
              <article key={pack.id} className="group border-t border-white/10 py-4 transition-colors hover:border-violet-400/50">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    {pack.tag}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">FF</span>
                </div>
                <h3 className="text-xl font-bold text-white">{pack.name}</h3>
                <div className="mt-3 text-3xl font-black text-cyan-300">{pack.diamonds}</div>
                <p className="text-sm text-slate-400">diamants</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-base font-bold text-white">{pack.price}</span>
                  <Link href="/topup" className="rounded-full bg-white/8 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-violet-500/30">
                    Commander
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-white/10 py-5 text-sm text-slate-400">
            Aucun pack de recharge n’est encore disponible. Les offres seront ajoutées depuis la base de données produit.
          </p>
        )}
      </section>

      <section className="page-shell py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300">Cartes cadeaux</p>
            <h2 className="section-heading mt-2">Codes numériques prêts à l’emploi</h2>
          </div>
          <Link href="/giftcards" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Explorer →
          </Link>
        </div>

        {giftCards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {giftCards.map((card) => (
              <article key={card.id} className="group border-t border-white/10 py-4 transition-colors hover:border-amber-300/50">
                <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-400">{card.type}</div>
                <h3 className="text-lg font-bold text-white">{card.name}</h3>
                <div className="mt-5 text-3xl font-black text-amber-300">{card.value}</div>
                <Link href="/giftcards" className="mt-5 inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-200">
                  Acheter
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-white/10 py-5 text-sm text-slate-400">
            Aucune carte cadeau n’est encore activée. Les offres seront ajoutées après synchronisation des catalogues.
          </p>
        )}
      </section>

      <section className="page-shell py-6">
        <div className="border-y border-white/10 py-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-violet-300">Hub Gaming IA</p>
              <h2 className="section-heading mt-2">Actualités Gaming</h2>
            </div>
            <Link href="/admin/events" className="text-sm font-semibold text-violet-200 hover:text-violet-100">
              Modérer les articles →
            </Link>
          </div>

          {aiEvents.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {aiEvents.map((event) => (
                <article key={event.title} className="border-t border-white/10 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="status-pill bg-violet-500/10 text-violet-200">{event.status}</span>
                    <span className="text-xs text-slate-400">{event.date}</span>
                  </div>
                  {event.image_url && <Image src={event.image_url} alt={event.title} width={1200} height={675} unoptimized className="mb-4 aspect-video w-full object-cover" />}
                  <h3 className="text-xl font-bold text-white">{event.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{event.summary}</p>
                  {event.reward && event.reward !== '0' && event.reward !== '0 HTG' && (
                    <div className="mt-4 border-l border-cyan-400/40 pl-3 text-sm text-cyan-200">Récompense : {event.reward}</div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="border-t border-white/10 py-5 text-sm text-slate-400">
              Les articles validés par l’équipe apparaîtront ici.
            </div>
          )}
        </div>
      </section>

      <section className="page-shell py-8">
        <div className="grid gap-8 border-y border-white/10 py-8 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] md:items-center md:py-10">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Espace client</p>
            <h2 className="mt-3 max-w-xl text-3xl font-black text-white">Suivez vos commandes en temps réel</h2>
            <Link href="/login" className="mt-6 inline-flex rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">
              Accéder au tableau de bord
            </Link>
          </div>
          <div className="border-t border-white/10 pt-2 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <ul className="divide-y divide-white/10 text-slate-300">
              <li className="py-4 first:pt-2 md:first:pt-4">Historique des achats et recharges</li>
              <li className="py-4">Statut de commande : En attente / Validée / Livrée</li>
              <li className="py-4 last:pb-2 md:last:pb-4">Support rapide et notifications d’état</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="site-footer mt-6">
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
            <div className="flex items-center gap-4">
              <Link href="/faq" className="transition hover:text-white">FAQ</Link>
              <Link href="/cgu" className="transition hover:text-white">CGU</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
