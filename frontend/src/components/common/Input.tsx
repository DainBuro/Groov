import React from 'react';
import styles from './Input.module.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const inputClasses = [
    styles.input,
    error && styles.error,
    fullWidth && styles.fullWidth,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${styles.inputWrapper} ${fullWidth ? styles.fullWidth : ''}`}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={inputClasses} {...props} />
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};
