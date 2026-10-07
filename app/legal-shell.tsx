import Image from 'next/image';
import Link from 'next/link';

export default function LegalShell({
  title,
  intro,
  children,
}: Readonly<{
  title: string;
  intro: string;
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen text-slate-100">
      <header className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
        <Link href="/" className="flex items-center" aria-label="BMF Top Up, accueil">
          <Image
            src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png"
            alt="Logo BMF Top Up"
            width={1320}
            height={1192}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-slate-300" aria-label="Navigation principale">
          <Link href="/topup" className="hover:text-white">Recharges</Link>
          <Link href="/giftcards" className="hover:text-white">Cartes cadeaux</Link>
          <Link href="/login" className="hover:text-white">Connexion</Link>
        </nav>
      </header>

      <section className="page-shell pb-16 pt-8 sm:pt-12">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">← Accueil</Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">BMF Top Up</p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{intro}</p>
          <div className="mt-9 space-y-8">{children}</div>
        </div>
      </section>

    </main>
  );
}