import Image from 'next/image';

type EmblemSize = 'sm' | 'lg';

/** Mobile uses a compact medallion; desktop scales it to the editorial column. */
const SHELL: Record<EmblemSize, string> = {
  sm: 'w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36',
  lg: 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-[clamp(260px,26vw,360px)] lg:h-[clamp(260px,26vw,360px)]',
};

/** Multi-layer circular studio emblem for the landing hero */
export default function HeroEmblem({
  size = 'sm',
  className = '',
}: {
  size?: EmblemSize;
  className?: string;
}) {
  return (
    <div className={`hero-emblem ${SHELL[size]} relative shrink-0 ${className}`.trim()}>
      <div className="hero-emblem-ring hero-emblem-ring-outer" />
      <div className="hero-emblem-ring hero-emblem-ring-mid" />
      <div className="hero-emblem-ring hero-emblem-ring-inner" />
      <div className="hero-emblem-core relative overflow-hidden rounded-full">
        <Image
          src="/images/logo.png"
          alt="Anugruja Arts Studio"
          fill
          sizes="(max-width: 1023px) 176px, 360px"
          priority
          className="object-contain p-3 sm:p-4"
        />
      </div>
    </div>
  );
}
