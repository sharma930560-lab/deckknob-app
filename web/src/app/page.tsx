import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-dk-bg">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-dk-neon-blue via-dk-neon-purple to-dk-neon-cyan opacity-50 blur-2xl animate-pulse"></div>
        <div className="relative glass-panel rounded-3xl p-12 max-w-lg border border-white/10">
          <h1 className="text-5xl font-black font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-400 mb-4">
            DECKKNOB
          </h1>
          <p className="text-zinc-400 text-lg mb-8">
            The Ultimate DJ Community & Nightlife Platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login" 
              className="dk-button dk-button-primary px-8 py-3 text-lg font-black"
            >
              LOGIN
            </Link>
            <Link 
              href="/signup" 
              className="dk-button dk-button-glass px-8 py-3 text-lg font-bold"
            >
              CREATE ACCOUNT
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
