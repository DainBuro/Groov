import React, { ReactNode } from "react";
import { Header } from "./Header";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>&copy; 2026 Groov</p>
      </footer>
    </div>
  );
};
