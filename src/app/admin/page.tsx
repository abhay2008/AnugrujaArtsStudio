import { Metadata } from 'next';
import { SiteProvider } from '@/context/SiteContext';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Studio Console — Anugruja Arts Studio',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <SiteProvider>
      <AdminDashboard />
    </SiteProvider>
  );
}
