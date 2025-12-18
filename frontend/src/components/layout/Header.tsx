import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";
import styles from "./Header.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faBars } from "@fortawesome/free-solid-svg-icons";

export const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} onClick={closeMobileMenu}>
          <h1>Groov</h1>
        </Link>

        {/* Desktop Navigation */}
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
        </nav>

        {/* Desktop Actions */}
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

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? (
            <FontAwesomeIcon icon={faXmark} />
          ) : (
            <FontAwesomeIcon icon={faBars} />
          )}
        </button>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              <Link
                to="/moves"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Dance Moves
              </Link>
              <Link
                to="/sequences"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Sequences
              </Link>
              <Link
                to="/events"
                className={styles.mobileNavLink}
                onClick={closeMobileMenu}
              >
                Events
              </Link>
            </nav>
            <div className={styles.mobileActions}>
              {isAuthenticated ? (
                <>
                  <span className={styles.mobileUsername}>
                    {user?.username}
                  </span>
                  <Button onClick={handleLogout} variant="outline" fullWidth>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobileMenu}>
                    <Button variant="outline" fullWidth>
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={closeMobileMenu}>
                    <Button variant="primary" fullWidth>
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
