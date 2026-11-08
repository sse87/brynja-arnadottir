import type { Metadata } from 'next';
import './globals.css';

// Temporary root layout for Phases 0–1. Phase 2 replaces it with src/app/[locale]/layout.tsx (SPEC §2.3).
export const metadata: Metadata = {
  title: 'Brynja Árnadóttir',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="is">
      <body>{children}</body>
    </html>
  );
}
