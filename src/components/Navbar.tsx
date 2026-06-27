import Link from "next/link";
import { MapPin } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <MapPin className="h-5 w-5 text-primary" />
          Local Lead Finder AI
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/search" className="text-slate-600 hover:text-slate-900">
            Search
          </Link>
        </nav>
      </div>
    </header>
  );
}
