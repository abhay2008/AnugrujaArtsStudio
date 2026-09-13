import Link from 'next/link';
import { studioMeta } from '@/data/artData';

export default function Footer() {
  return (
    <footer className="w-full py-12 px-4 border-t border-studio-gold/20 bg-[#0c0213] text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
        <p className="text-yellow-100/70 text-sm">
          &copy; {new Date().getFullYear()} {studioMeta.name}. All rights reserved.
        </p>
        <p className="text-base font-bold text-[#b4b646]">
          Developer:{' '}
          <a
            href={studioMeta.developerGithub}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#fafc97] hover:underline hover:text-white transition-colors"
          >
            {studioMeta.developerName}
          </a>
        </p>
        <div className="flex items-center gap-4 text-xs text-yellow-200/50 pt-1">
          <Link href="/admin" className="hover:text-studio-gold transition-colors">
            Studio Admin Portal
          </Link>
        </div>
      </div>
    </footer>
  );
}
