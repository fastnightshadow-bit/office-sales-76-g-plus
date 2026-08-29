import { getPublicationSite } from "./publication-config";

export interface SeoProps {
  title: string;
  description: string;
  image?: string;
  path: string;
  type?: "article" | "website";
}

const brand = "Офис продаж 76";
const projectCount = 92;

export interface ProjectSeoInput {
  slug: string;
  title: string;
  coverImage?: { src: string };
}

const routeMetadata: Record<string, SeoProps> = {
  "/": {
    title: `Новостройки Ярославля — ${brand}`,
    description: `Сравните ${projectCount} проекта новостроек Ярославля в частной демонстрации сайта «${brand}».`,
    path: "/",
  },
  "/catalog": {
    title: `Каталог новостроек Ярославля — ${brand}`,
    description: `${projectCount} проекта новостроек Ярославля для спокойного сравнения по району, сроку и цене.`,
    path: "/catalog",
  },
  "/favorites": {
    title: `Избранные проекты — ${brand}`,
    description: "Сохранённые в этом браузере проекты новостроек для удобного сравнения.",
    path: "/favorites",
  },
  "/about": {
    title: `О компании — ${brand}`,
    description: "Информация о команде «Офис продаж 76» и её работе с новостройками Ярославля.",
    path: "/about",
  },
  "/contacts": {
    title: `Контакты — ${brand}`,
    description: "Телефоны, электронная почта и адрес офиса компании «Офис продаж 76» в Ярославле.",
    path: "/contacts",
  },
  "/privacy": {
    title: `Политика конфиденциальности — ${brand}`,
    description: "Политика обработки персональных данных в частной демонстрации сайта «Офис продаж 76».",
    path: "/privacy",
  },
  "/consent": {
    title: `Согласие на обработку данных — ${brand}`,
    description: "Условия согласия на обработку персональных данных для предварительного ознакомления.",
    path: "/consent",
  },
};

function safeRoutePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[?#]/.test(path)) return false;
  try {
    return !decodeURIComponent(path).split("/").includes("..");
  } catch {
    return false;
  }
}

export function isSafeLocalImage(path: string): boolean {
  if (!safeRoutePath(path) || !path.startsWith("/media/")) return false;
  return /^\/media\/[A-Za-z0-9._/-]+\.(?:avif|jpe?g|png|webp)$/i.test(path)
    && !path.split("/").includes("..");
}

export function buildCanonical(path: string, siteUrl?: string): string | undefined {
  if (!siteUrl || !safeRoutePath(path)) return undefined;

  const base = getPublicationSite(siteUrl);
  if (!base) return undefined;
  const basePath = base.pathname.replace(/\/+$/, "");
  base.pathname = `${basePath}${path === "/" ? "/" : path}`.replace(/\/{2,}/g, "/");
  return base.href;
}

export function getProjectSeo(project: ProjectSeoInput): SeoProps {
  const image = project.coverImage?.src;
  return {
    title: `${project.title} — новостройка в Ярославле | ${brand}`,
    description: `${project.title} в Ярославле. Проверенные сведения из локального снимка каталога «${brand}».`,
    ...(image && isSafeLocalImage(image) ? { image } : {}),
    path: `/catalog/${encodeURIComponent(project.slug)}`,
    type: "article",
  };
}

export function getNotFoundSeo(pathname: string): SeoProps {
  return {
    title: `Страница не найдена — ${brand}`,
    description: "Запрошенной страницы нет в частной демонстрации сайта «Офис продаж 76».",
    path: safeRoutePath(pathname) ? pathname : "/",
  };
}

export function getRouteSeo(pathname: string): SeoProps | undefined {
  const staticMetadata = routeMetadata[pathname];
  if (staticMetadata) return staticMetadata;

  if (/^\/catalog\/[^/]+$/.test(pathname)) return undefined;
  return getNotFoundSeo(pathname);
}
