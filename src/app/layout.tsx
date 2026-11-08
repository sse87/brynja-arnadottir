import type { Metadata } from 'next';
import './globals.css';
import { serif, sans } from './fonts';

// Temporary root layout for Phases 0–1. Phase 2 replaces it with src/app/[locale]/layout.tsx (SPEC §2.3).
export const metadata: Metadata = {
  title: 'Brynja Árnadóttir',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-body text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
