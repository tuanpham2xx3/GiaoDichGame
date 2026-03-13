import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../contexts/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GiaoDichGame – Sàn giao dịch tài khoản game uy tín',
  description: 'Mua bán tài khoản game an toàn với hệ thống Escrow bảo vệ người mua.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className="bg-[#0f1117] text-[#f0f2f8] font-sans min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
