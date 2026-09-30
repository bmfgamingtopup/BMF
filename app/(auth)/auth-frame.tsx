import Image from 'next/image';
import Link from 'next/link';

export default function AuthFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-[#202127] text-slate-100 min-[640px]:grid min-[640px]:min-h-screen min-[640px]:grid-cols-[57fr_43fr]">
      <div className="relative h-[30vh] min-h-56 overflow-hidden sm:h-[36vh] min-[640px]:h-screen min-[640px]:min-h-[680px]">
        <Link href="/" aria-label="Retour à l’accueil" title="Retour à l’accueil" className="absolute left-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#202127]/70 text-2xl text-white backdrop-blur-sm transition hover:border-orange-400 hover:bg-[#202127]/90">
          ←
        </Link>
        <Image
          src="/images/ff-illustration.jpg"
          alt="Illustration gaming BMF"
          fill
          priority
          sizes="(min-width: 1024px) 57vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202127]/45 via-transparent to-black/10 min-[640px]:bg-[linear-gradient(90deg,transparent_55%,rgba(32,33,39,0.55)_82%,#202127_100%)]" />
      </div>
      <section className="flex min-h-[70vh] items-center justify-center px-6 py-10 sm:px-10 min-[640px]:min-h-screen min-[640px]:px-8 min-[1024px]:px-12">
        <div className="w-full max-w-[360px]">{children}</div>
      </section>
    </main>
  );
}
