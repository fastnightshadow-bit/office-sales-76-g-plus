import { ArrowUpRight } from "lucide-react";
import { BrowserRouter, Link } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav/MobileBottomNav";
import { SiteFooter } from "../components/SiteFooter/SiteFooter";
import { SiteHeader } from "../components/SiteHeader/SiteHeader";
import styles from "./App.module.css";

function ShellPreview() {
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">К содержанию</a>
      <SiteHeader mode="solid" />
      <main className={styles.main} id="main-content">
        <div className={`container ${styles.intro}`}>
          <p className={styles.eyebrow}>G+ Edition</p>
          <h1>Офис продаж 76</h1>
          <p className={styles.summary}>
            Полный каталог новостроек Ярославля появится здесь на следующем этапе. Общая система интерфейса уже готова для всех разделов.
          </p>
          <Link className={styles.catalogLink} to="/catalog">
            Перейти к каталогу
            <ArrowUpRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ShellPreview />
    </BrowserRouter>
  );
}
