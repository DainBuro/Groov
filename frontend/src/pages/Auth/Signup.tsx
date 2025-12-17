import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import styles from './Auth.module.scss';

export const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ username, password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed. Username may already be taken.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2>Join Groov</h2>
        <p className={styles.subtitle}>Create an account to start learning dance moves!</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="text"
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            fullWidth
          />

          <Input
            type="password"
            label="Password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};
