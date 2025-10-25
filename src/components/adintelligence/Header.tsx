import Image from "next/image";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/40 border-b border-white/40 shadow-lg">
      <div className="px-8 py-4 flex items-center gap-3">
        <Image 
          src="/film.svg" 
          alt="Crea" 
          width={24} 
          height={24}
          className="w-6 h-6"
        />
        <span className="text-xl font-semibold text-gray-900 tracking-tight">Crea</span>
      </div>
    </header>
  );
}
