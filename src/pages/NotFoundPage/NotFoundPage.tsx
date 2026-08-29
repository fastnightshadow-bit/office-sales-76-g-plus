import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "../../app/RouteState.module.css";

export default function NotFoundPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className={styles.state}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Ошибка 404</p>
        <h1 ref={headingRef} tabIndex={-1}>Страница не найдена</h1>
        <p className={styles.explanation}>
          Возможно, адрес изменился или в нём есть опечатка. В каталоге можно найти проект по названию,
          району или адресу.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} to="/catalog">Искать в каталоге</Link>
          <Link className={styles.secondary} to="/">На главную</Link>
        </div>
      </div>
    </section>
  );
}
