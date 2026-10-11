import Link from 'next/link';
import Image from 'next/image';

const advantages = [
  {
    number: '01',
    title: 'Un parcours simple',
    description: 'Choisis une recharge ou une carte, indique les informations nécessaires et suis les étapes de paiement.',
  },
  {
    number: '02',
    title: 'Un espace joueur dédié',
    description: 'Connecte-toi pour retrouver tes commandes, tes notifications de livraison et les sondages BMF.',
  },
  {
    number: '03',
    title: 'Une validation suivie',
    description: 'Chaque paiement est vérifié. Les codes disponibles sont ensuite remis dans ton espace joueur.',
  },
];

export default function HomePage() {
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
            <Link href="/giftcards" className="transition hover:text-white">Cartes cadeaux</Link>
            <Link href="/faq" className="transition hover:text-white">Aide</Link>
          </nav>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link href="/login" className="secondary-btn px-3 py-2 text-xs sm:px-4 sm:text-sm">Se connecter</Link>
            <Link href="/register" className="primary-btn px-3 py-2 text-xs sm:px-4 sm:text-sm">Créer un compte</Link>
          </div>
        </header>

        <section className="page-shell relative z-10 flex min-h-[calc(100svh-4rem)] items-center pb-12 pt-6 lg:pb-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="game-reveal game-reveal-delay-1 inline-flex items-center gap-3 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200">
                <span className="game-status-dot h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_16px_rgba(196,181,253,0.9)]" />
                Ton univers gaming, au même endroit
              </div>

              <div className="game-reveal game-reveal-delay-2 space-y-4">
                <h1 className="hero-heading max-w-2xl">Prêt à reprendre la partie ?</h1>
                <p className="hero-copy max-w-xl">
                  Recharge tes diamants Free Fire, découvre des cartes cadeaux et retrouve chaque mise à jour dans ton espace joueur BMF.
                </p>
              </div>

              <div className="game-reveal game-reveal-delay-3 flex flex-wrap gap-3">
                <Link href="/topup" className="primary-btn">Découvrir les recharges</Link>
                <Link href="/register" className="secondary-btn">Rejoindre BMF</Link>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs font-medium text-slate-300">
                <span>Diamants Free Fire</span>
                <span>Cartes cadeaux numériques</span>
                <span>Suivi depuis ton compte</span>
              </div>
            </div>

            <div className="game-reveal game-reveal-delay-4 relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-5 rounded-[2rem] bg-violet-500/10 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/80 p-3 shadow-2xl shadow-black/30">
                <Image
                  src="/images/ff-illustration.jpg"
                  alt="Illustration de l’univers Free Fire"
                  width={1200}
                  height={675}
                  priority
                  className="aspect-[16/10] w-full rounded-2xl object-cover"
                />
                <div className="flex items-center justify-between gap-4 px-3 py-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Le jeu continue</p>
                    <p className="mt-1 text-lg font-bold text-white">Ta prochaine partie commence ici.</p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-400/15 text-2xl" aria-hidden="true">◆</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="page-shell py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">BMF, côté joueur</p>
          <h2 className="section-heading mt-3">Tout ce qu’il te faut pour rester dans le jeu</h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">Une expérience pensée pour les joueurs : claire, pratique et centrée sur ton compte.</p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {advantages.map((advantage) => (
            <article key={advantage.number} className="border-t border-white/10 py-5">
              <span className="text-xs font-bold tracking-[0.2em] text-violet-300">{advantage.number}</span>
              <h3 className="mt-4 text-lg font-bold text-white">{advantage.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{advantage.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell pb-16 sm:pb-20">
        <div className="grid gap-8 rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/10 via-[#111827] to-cyan-500/10 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-violet-200">Ton espace joueur BMF</p>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">Commandes, actualités et sondages au même endroit.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Connecte-toi pour suivre la validation de tes paiements et recevoir tes codes dès qu’ils sont prêts.</p>
          </div>
          <Link href="/login" className="primary-btn whitespace-nowrap">Accéder à mon espace</Link>
        </div>
      </section>
    </main>
  );
}
