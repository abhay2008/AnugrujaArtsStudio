'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { studioMeta } from '@/data/artData';

const socialLinks = [
  { href: studioMeta.whatsappUrl, title: 'WhatsApp' },
  { href: studioMeta.facebookUrl, title: 'Facebook' },
  { href: studioMeta.instagramUrl, title: 'Instagram' },
  { href: studioMeta.youtubeUrl, title: 'YouTube' },
];

const mobileNavItems = [
  { href: '/', label: 'Home' },
  { href: '/sale', label: 'Art for Sale' },
  { href: '/classes', label: 'Courses & Classes' },
  { href: '/about', label: 'About us' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();

  // Close menus whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 w-full h-[4.4em] z-50 bg-[#140620]/95 backdrop-blur-md border-b border-studio-gold/25 shadow-[0_4px_25px_rgba(0,0,0,0.55)] px-4 md:px-8 flex items-center justify-between">
      {/* Left: Social Media Links (desktop only) */}
      <div className="hidden lg:flex items-center gap-3 flex-1">
        <span className="font-blippo text-amber-200 text-base tracking-wide">Socials:</span>
        {socialLinks.map((social) => (
          <a
            key={social.title}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            title={social.title}
            className="text-amber-100 hover:text-studio-gold hover:scale-125 transition-all text-lg"
          >
            <span className="sr-only">{social.title}</span>
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              {social.title === 'WhatsApp' && (
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              )}
              {social.title === 'Facebook' && (
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              )}
              {social.title === 'Instagram' && (
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              )}
              {social.title === 'YouTube' && (
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              )}
            </svg>
          </a>
        ))}
      </div>

      {/* Center: Brand Title */}
      <h1 className="font-blippo text-center tracking-wider flex-grow lg:flex-grow-0">
        <Link
          href="/about"
          className="nav-link text-studio-gold hover:text-white text-lg md:text-2xl font-bold transition-all hover:drop-shadow-[0_0_15px_rgba(242,215,112,0.7)]"
        >
          {studioMeta.founder}
        </Link>
      </h1>

      {/* Right: Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-6 flex-1 justify-end">
        <Link
          href="/"
          className="nav-link font-blippo text-yellow-300 hover:text-white text-lg transition-transform hover:-translate-y-0.5"
        >
          Home
        </Link>

        {/* Dropdown for Products & Services */}
        <div
          className="relative"
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="nav-link font-blippo text-yellow-300 hover:text-white text-lg flex items-center gap-1 transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            Products &amp; Services
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 rounded-xl bg-[#280a40]/95 backdrop-blur-xl border border-purple-300/40 shadow-2xl py-2 flex flex-col z-50 animate-fadeSlideDown">
              <Link
                href="/sale"
                className="px-4 py-2 text-studio-gold hover:bg-purple-900/60 hover:text-white font-blippo text-base transition-colors"
              >
                Art for sale
              </Link>
              <Link
                href="/#two"
                className="px-4 py-2 text-studio-gold hover:bg-purple-900/60 hover:text-white font-blippo text-base transition-colors"
              >
                Workshops
              </Link>
              <Link
                href="/sale#commission"
                className="px-4 py-2 text-studio-gold hover:bg-purple-900/60 hover:text-white font-blippo text-base transition-colors"
              >
                Commissioned artwork
              </Link>
              <Link
                href="/classes"
                className="px-4 py-2 text-studio-gold hover:bg-purple-900/60 hover:text-white font-blippo text-base transition-colors border-t border-purple-800/40 mt-1 pt-3"
              >
                Courses &amp; Classes
              </Link>
              <div className="pl-6 flex flex-col">
                <Link
                  href="/classes#online"
                  className="px-3 py-1.5 text-sm text-yellow-200/80 hover:text-white hover:bg-purple-900/40 font-blippo transition-colors"
                >
                  Online-Offline Classes
                </Link>
                <Link
                  href="/classes#water"
                  className="px-3 py-1.5 text-sm text-yellow-200/80 hover:text-white hover:bg-purple-900/40 font-blippo transition-colors"
                >
                  Watercolour Courses
                </Link>
                <Link
                  href="/classes#short"
                  className="px-3 py-1.5 text-sm text-yellow-200/80 hover:text-white hover:bg-purple-900/40 font-blippo transition-colors"
                >
                  Short Term Courses
                </Link>
              </div>
            </div>
          )}
        </div>

        <Link
          href="/about"
          className="nav-link font-blippo text-yellow-300 hover:text-white text-lg transition-transform hover:-translate-y-0.5"
        >
          About us
        </Link>
      </nav>

      {/* Mobile Menu Hamburger Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle Navigation Menu"
        aria-expanded={mobileMenuOpen}
        className="lg:hidden p-2 rounded-lg bg-studio-purple/60 border border-studio-gold/40 text-studio-gold hover:text-white hover:scale-105 transition-all"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed top-[4.4em] left-0 w-full h-[calc(100vh-4.4em)] bg-[#150524]/98 backdrop-blur-2xl border-t border-studio-gold/30 p-6 flex flex-col gap-1 overflow-y-auto z-40 animate-drawerIn">
          {mobileNavItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{ animationDelay: `${i * 55}ms` }}
              className="font-blippo text-2xl text-studio-gold hover:text-white border-b border-purple-800/40 py-4 hover:pl-2 transition-all animate-fadeSlideUp"
            >
              {item.label}
            </Link>
          ))}

          {/* Socials inside mobile menu */}
          <div className="mt-8 pt-6 border-t border-studio-gold/20 flex items-center justify-around">
            {socialLinks.map((social) => (
              <a
                key={social.title}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-studio-gold text-base font-blippo hover:text-white hover:scale-110 transition-all"
              >
                {social.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
