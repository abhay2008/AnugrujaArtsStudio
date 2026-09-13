import { studioMeta } from '@/data/artData';

export default function ContactActionButtons() {
  return (
    <div className="w-full max-w-md mx-auto my-8 px-4">
      <div className="relative rounded-2xl bg-gradient-to-r from-purple-950 via-[#370e55] to-purple-950 border-2 border-purple-300/80 p-4 shadow-[0_0_30px_rgba(242,215,112,0.2)] flex items-center justify-between gap-4">
        {/* Gmail Direct Compose */}
        <a
          href={`mailto:${studioMeta.email}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-300/40 text-purple-200 hover:text-white font-bold transition-all transform hover:scale-105"
        >
          <svg className="w-5 h-5 fill-current text-purple-300" viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
          <span>Gmail</span>
        </a>

        {/* WhatsApp Direct Chat */}
        <a
          href={studioMeta.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-950/80 hover:bg-green-900 border border-green-400/40 text-green-300 hover:text-white font-bold transition-all transform hover:scale-105"
        >
          <svg className="w-5 h-5 fill-current text-green-400" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
          </svg>
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
