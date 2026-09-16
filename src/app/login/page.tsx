import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In — Anugruja Arts Studio Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#100318]" />}>
      <LoginClient />
    </Suspense>
  );
}
