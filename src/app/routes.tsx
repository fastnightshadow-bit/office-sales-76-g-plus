import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet, type RouteObject, useLocation } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav/MobileBottomNav";
import { PageSkeleton } from "../components/PageSkeleton/PageSkeleton";
import { SiteFooter } from "../components/SiteFooter/SiteFooter";
import { SiteHeader } from "../components/SiteHeader/SiteHeader";
import { getRouteSeo } from "../seo/seo-config";
import { Seo } from "../seo/Seo";
import { AppErrorBoundary } from "./AppErrorBoundary";
import styles from "./App.module.css";

const HomePage = lazy(async () => import("../pages/HomePage/HomePage"));
const CatalogPage = lazy(async () => import("../pages/CatalogPage/CatalogPage"));
const ProjectPage = lazy(async () => import("../pages/ProjectPage/ProjectPage"));
const FavoritesPage = lazy(async () => import("../pages/FavoritesPage/FavoritesPage"));
const AboutPage = lazy(async () => import("../pages/AboutPage/AboutPage"));
const ContactsPage = lazy(async () => import("../pages/ContactsPage/ContactsPage"));
const LegalPage = lazy(async () => import("../pages/LegalPage/LegalPage"));
const NotFoundPage = lazy(async () => import("../pages/NotFoundPage/NotFoundPage"));

function AppLayout() {
  const { pathname } = useLocation();
  const seo = getRouteSeo(pathname);
  return (
    <div className={styles.app}>
      {seo ? <Seo {...seo} /> : null}
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

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        errorElement: <AppErrorBoundary />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "catalog", element: <CatalogPage /> },
          { path: "catalog/:slug", element: <ProjectPage /> },
          { path: "favorites", element: <FavoritesPage /> },
          { path: "about", element: <AboutPage /> },
          { path: "contacts", element: <ContactsPage /> },
          { path: "privacy", element: <LegalPage kind="privacy" /> },
          { path: "consent", element: <LegalPage kind="consent" /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
