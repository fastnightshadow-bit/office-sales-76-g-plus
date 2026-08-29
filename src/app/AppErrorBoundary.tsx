import { useEffect, useRef } from "react";
import { Link, useRouteError } from "react-router-dom";
import styles from "./RouteState.module.css";

export function AppErrorBoundary() {
  useRouteError();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section className={styles.state}>
      <div className={`container ${styles.inner}`}>
        <p className={styles.eyebrow}>Техническая ошибка</p>
        <h1 ref={headingRef} tabIndex={-1}>Страница временно недоступна</h1>
        <p className={styles.explanation}>
          Интерфейс столкнулся с технической ошибкой. Мы не подменяем результат вымышленными данными:
          можно повторить загрузку или перейти в доступный раздел.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => globalThis.location.reload()} type="button">
            Повторить попытку
          </button>
          <Link className={styles.secondary} to="/catalog">Открыть каталог</Link>
          <Link className={styles.textLink} to="/">На главную</Link>
        </div>
      </div>
    </section>
  );
}
