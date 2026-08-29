import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import styles from "./Reveal.module.css";

interface RevealProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
}

export function Reveal({ children, className, ...props }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "pending">("visible");

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof window === "undefined") return;

    const reducedMotion = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      setState("visible");
      return;
    }

    setState("pending");
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setState("visible");
      observer.disconnect();
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      {...props}
      className={`${styles.reveal} ${state === "pending" ? styles.pending : styles.visible} ${className ?? ""}`}
      data-reveal-state={state}
      ref={elementRef}
    >
      {children}
    </div>
  );
}
