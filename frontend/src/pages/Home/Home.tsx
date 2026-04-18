import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import styles from "./Home.module.scss";

export const Home: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/moves" replace />;

  return (
    <div className="container">
      <div className={styles.hero}>
        <h1>Welcome to Groov</h1>
        <p className={styles.subtitle}>
          Your platform for learning and creating Lindy Hop dance sequences
        </p>

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
