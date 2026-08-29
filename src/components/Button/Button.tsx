import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "regular" | "large";
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "regular",
  fullWidth = false,
  isLoading = false,
  loadingLabel = "Загрузка",
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    className ?? "",
  ].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={classes}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading ? (
        <>
          <LoaderCircle aria-hidden="true" className={styles.spinner} size={19} />
          <span>{loadingLabel}</span>
        </>
      ) : children}
    </button>
  );
}
