'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, Menu, X, LogOut } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    document.cookie = 'rm_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    setUser(null);
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          ReviewMiner
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <Link href="/#try-it" className="hover:text-white transition-colors">Try It</Link>
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">{user.email}</span>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-4 py-1.5 rounded-lg transition-colors">
                Get Started Free
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-gray-400" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 flex flex-col gap-3 text-sm">
          <Link href="/#features" className="text-gray-400" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/#pricing" className="text-gray-400" onClick={() => setMenuOpen(false)}>Pricing</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-gray-400" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <button onClick={handleLogout} className="text-red-400 text-left">Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-400" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link href="/register" className="text-emerald-400" onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
