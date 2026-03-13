import type { Metadata } from 'next';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'GIAODICHGAME – Sàn mua bán tài khoản game uy tín',
  description: 'Sprint 0 – Nền tảng đang được xây dựng. Coming soon!',
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      <div className={styles.glow} />

      <div className={styles.content}>
        <div className={styles.badge}>🚀 Sprint 0 – Setup &amp; Architecture</div>

        <h1 className={styles.title}>
          <span className={styles.gradient}>GIAODICH</span>GAME
        </h1>

        <p className={styles.subtitle}>
          Sàn C2C mua bán tài khoản game uy tín hàng đầu Việt Nam
        </p>

        <div className={styles.features}>
          <div className={styles.feature}>
            <span>🔒</span>
            <span>Escrow 72h tự động</span>
          </div>
          <div className={styles.feature}>
            <span>💎</span>
            <span>Quỹ bảo hiểm Seller</span>
          </div>
          <div className={styles.feature}>
            <span>⚡</span>
            <span>Giao dịch tức thì</span>
          </div>
        </div>

        <p className={styles.status}>
          ⚙️ Hệ thống đang được xây dựng — coming soon!
        </p>
      </div>
    </main>
  );
}
