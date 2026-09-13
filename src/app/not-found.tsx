import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <h2 className="font-blippo text-4xl text-[#ffe76c]">Page Not Found</h2>
      <p className="text-sm text-yellow-100/70 max-w-md">
        The artwork or page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all"
      >
        Return to Gallery Home
      </Link>
    </div>
  );
}
