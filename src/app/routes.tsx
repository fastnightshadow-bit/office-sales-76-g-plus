import { lazy, Suspense } from "react";
import { createBrowserRouter, Link, Outlet, type RouteObject, useLocation } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav/MobileBottomNav";
import { PageSkeleton } from "../components/PageSkeleton/PageSkeleton";
import { SiteFooter } from "../components/SiteFooter/SiteFooter";
import { SiteHeader } from "../components/SiteHeader/SiteHeader";
import styles from "./App.module.css";

const HomePage = lazy(async () => import("../pages/HomePage/HomePage"));
const CatalogPage = lazy(async () => import("../pages/CatalogPage/CatalogPage"));
const ProjectPage = lazy(async () => import("../pages/ProjectPage/ProjectPage"));
const FavoritesPage = lazy(async () => import("../pages/FavoritesPage/FavoritesPage"));
const AboutPage = lazy(async () => import("../pages/AboutPage/AboutPage"));
const ContactsPage = lazy(async () => import("../pages/ContactsPage/ContactsPage"));
const LegalPage = lazy(async () => import("../pages/LegalPage/LegalPage"));

function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className={styles.app}>
      <a className={styles.skipLink} href="#main-content">К содержанию</a>
      <SiteHeader mode={pathname === "/" ? "overlay" : "solid"} />
      <main className={styles.main} id="main-content">
        <Suspense fallback={<PageSkeleton label="Загружаем страницу" />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
}

function RoutePlaceholder({ title }: { title: string }) {
  return (
    <section className={styles.placeholder}>
      <div className={`container ${styles.placeholderInner}`}>
        <p className={styles.placeholderBadge}>Частная демонстрация</p>
        <h1>{title}</h1>
        <p>Этот раздел будет собран на следующем этапе. Главная уже использует локальный проверенный снимок каталога.</p>
        <Link to="/">Вернуться на главную</Link>
      </div>
    </section>
  );
}

function RouteError() {
  return <RoutePlaceholder title="Страница временно недоступна" />;
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "catalog", element: <CatalogPage /> },
      { path: "catalog/:slug", element: <ProjectPage /> },
      { path: "favorites", element: <FavoritesPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "privacy", element: <LegalPage kind="privacy" /> },
      { path: "consent", element: <LegalPage kind="consent" /> },
      { path: "*", element: <RoutePlaceholder title="Такой страницы пока нет" /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
