"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/trace', label: 'Trace' },
  { href: '/typing', label: 'Typing WPM' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-black/40 border-b border-neon/20">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-neon font-semibold tracking-wide">HackerTrace</Link>
        <ul className="flex items-center gap-4 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`px-2 py-1 rounded transition-colors ${active ? 'text-black bg-neon' : 'text-neon/80 hover:text-neon'}`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
