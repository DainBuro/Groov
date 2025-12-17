import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import styles from "./Home.module.scss";

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container">
      <div className={styles.hero}>
        <h1>Welcome to Groov</h1>
        <p className={styles.subtitle}>
          Your platform for learning and creating Lindy Hop dance sequences
        </p>

        {!isAuthenticated ? (
          <div className={styles.actions}>
            <Link to="/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link to="/moves">
              <Button variant="outline" size="lg">
                Browse Moves
              </Button>
            </Link>
          </div>
        ) : (
          <div className={styles.actions}>
            <Link to="/moves">
              <Button size="lg">Explore Dance Moves</Button>
            </Link>
            <Link to="/sequences">
              <Button variant="secondary" size="lg">
                My Sequences
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className={styles.features}>
        <div className={styles.featureCard}>
          <h3>Learn Moves</h3>
          <p>
            Browse through a comprehensive library of Lindy Hop dance moves with
            detailed descriptions and difficulty levels.
          </p>
        </div>
        <div className={styles.featureCard}>
          <h3>Create Sequences</h3>
          <p>
            Build your own dance sequences by combining moves. Perfect for
            choreography and practice.
          </p>
        </div>
        <div className={styles.featureCard}>
          <h3>Track Events</h3>
          <p>
            Associate your sequences with specific events and keep track of your
            choreography journey.
          </p>
        </div>
      </div>
    </div>
  );
};
