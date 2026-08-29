import { useEffect } from "react";
import { buildCanonical, isSafeLocalImage, type SeoProps } from "./seo-config";

interface HeadSnapshot {
  element: HTMLElement;
  created: boolean;
  content: string | null;
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string): HeadSnapshot {
  const current = document.head.querySelector<HTMLMetaElement>(selector);
  const element = current ?? document.createElement("meta");
  const snapshot = { element, created: current === null, content: current?.getAttribute("content") ?? null };
  element.setAttribute(attribute, key);
  element.setAttribute("content", content);
  element.dataset.routeSeo = "";
  if (!current) document.head.append(element);
  return snapshot;
}

function setCanonical(href: string): HeadSnapshot {
  const current = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const element = current ?? document.createElement("link");
  const snapshot = { element, created: current === null, content: current?.getAttribute("href") ?? null };
  element.setAttribute("rel", "canonical");
  element.setAttribute("href", href);
  element.dataset.routeSeo = "";
  if (!current) document.head.append(element);
  return snapshot;
}

function restore(snapshot: HeadSnapshot): void {
  if (snapshot.created) {
    snapshot.element.remove();
    return;
  }
  const attribute = snapshot.element instanceof HTMLLinkElement ? "href" : "content";
  if (snapshot.content === null) snapshot.element.removeAttribute(attribute);
  else snapshot.element.setAttribute(attribute, snapshot.content);
  delete snapshot.element.dataset.routeSeo;
}

export function Seo({ title, description, image, path, type = "website" }: SeoProps) {
  useEffect(() => {
    const previousTitle = document.title;
    const canonical = buildCanonical(path, import.meta.env.VITE_SITE_URL);
    const snapshots = [
      setMeta('meta[name="description"]', "name", "description", description),
      setMeta('meta[property="og:title"]', "property", "og:title", title),
      setMeta('meta[property="og:description"]', "property", "og:description", description),
      setMeta('meta[property="og:type"]', "property", "og:type", type),
      setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Офис продаж 76"),
    ];

    document.title = title;
    if (canonical) {
      snapshots.push(setCanonical(canonical));
      snapshots.push(setMeta('meta[property="og:url"]', "property", "og:url", canonical));
    }
    if (image && isSafeLocalImage(image)) {
      const imageUrl = canonical ? new URL(image, canonical).href : image;
      snapshots.push(setMeta('meta[property="og:image"]', "property", "og:image", imageUrl));
    }

    return () => {
      document.title = previousTitle;
      snapshots.reverse().forEach(restore);
    };
  }, [description, image, path, title, type]);

  return null;
}
