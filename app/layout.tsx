import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Weeble — Simple US prepaid wireless',
  description: 'Four simple Weeble plans for the United States. Instant eSIM. No surprises.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-ink-950">
      <body className={`${inter.variable} font-sans antialiased bg-ink-950 text-ink-50`}>
        <Navbar />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8 sm:py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
