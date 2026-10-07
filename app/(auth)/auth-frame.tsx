import Image from 'next/image';
import Link from 'next/link';

type AuthFrameProps = Readonly<{
  children: React.ReactNode;
  variant: 'login' | 'register';
}>;

export default function AuthFrame({ children, variant }: AuthFrameProps) {
  const alternatePage = variant === 'login'
    ? { href: '/register', label: "M'inscrire" }
    : { href: '/login', label: 'Connexion' };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f4eeeb_0%,#e7e2df_48%,#f1ece9_100%)] text-[#292322]">
      <header className="border-b border-[#e7dfdc] bg-white/95">
        <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="BMF Top Up, accueil" className="flex items-center gap-3">
            <Image
              src="/images/f4926c3f-d414-4219-8637-7c45c80f82ce.png"
              alt="Logo BMF Top Up"
              width={1320}
              height={1192}
              priority
              className="h-12 w-12 object-contain"
            />
            <span className="text-lg font-extrabold tracking-tight text-[#202027]">BMF Top Up</span>
          </Link>
          <Link
            href={alternatePage.href}
            className="rounded-xl bg-[#e43b34] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#cf302a]"
          >
            {alternatePage.label}
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        {children}
      </section>
    </main>
  );
}
