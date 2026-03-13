import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GIAODICHGAME – Sàn mua bán tài khoản game',
  description:
    'Nền tảng C2C mua bán tài khoản game uy tín tại Việt Nam. Bảo vệ người mua với hệ thống Escrow tự động.',
  keywords: ['mua bán acc game', 'giaodichgame', 'sàn game', 'tài khoản game'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
