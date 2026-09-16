import type { Metadata } from 'next';
import { SiteProvider } from '@/context/SiteContext';

export const metadata: Metadata = {
  title: 'Admin Studio Console — Anugruja Arts Studio',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Admin surface: no public header, footer, ambient or scroll-reveal layers.
 * The whole console sits on the studio's own dark ground and scrolls normally.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteProvider>
      <div className="min-h-dvh bg-[#100318] text-[#fdf5cf]">{children}</div>
    </SiteProvider>
  );
}
