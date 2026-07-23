import Link from "next/link";
import styles from "./AppFooter.module.css";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <p className={styles.name}>RoofStead</p>
          <p className={styles.copy}>Marketplace for homes to rent or buy.</p>
        </div>
        <div className={styles.links}>
          <Link href="/listings">Listings</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
