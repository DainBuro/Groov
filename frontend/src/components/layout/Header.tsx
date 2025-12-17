import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";
import styles from "./Header.module.scss";

export const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <h1>Groov</h1>
        </Link>

        <nav className={styles.nav}>
          <Link to="/moves" className={styles.navLink}>
            Dance Moves
          </Link>
          <Link to="/sequences" className={styles.navLink}>
            Sequences
          </Link>
          <Link to="/events" className={styles.navLink}>
            Events
          </Link>
          {/* {isAdmin && (
            <Link to="/admin" className={styles.navLink}>
              Admin
            </Link>
          )} */}
        </nav>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <span className={styles.username}>{user?.username}</span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
