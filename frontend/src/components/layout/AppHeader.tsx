import Link from "next/link";
import styles from "./AppHeader.module.css";

const nav = [
  { href: "/listings", label: "Browse" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <span>
            <span className={styles.brandName}>RoofStead</span>
            <span className={styles.brandTag}>Rent &amp; sale</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/seller/post" className={styles.outlineBtn}>
            Post listing
          </Link>
          <Link href="/auth/login" className={styles.textBtn}>
            Log in
          </Link>
          <Link href="/auth/signup" className={styles.primaryBtn}>
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
