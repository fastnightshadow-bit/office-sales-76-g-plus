import { ImageOff } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { ImageAsset, ImageVariant } from "../../features/catalog/catalog.types";
import styles from "./ResponsiveImage.module.css";

interface ResponsiveImageProps {
  asset?: ImageAsset;
  alt: string;
  sizes?: string;
  ratio?: CSSProperties["aspectRatio"];
  eager?: boolean;
  compactSourceWidth?: 480;
  className?: string;
  imageClassName?: string;
}

function buildSrcSet(variants: ImageVariant[], format: ImageVariant["format"]) {
  return variants
    .filter((variant) => variant.format === format)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}

export function ResponsiveImage({
  asset,
  alt,
  sizes = "(max-width: 767px) 100vw, 50vw",
  ratio = "4 / 3",
  eager = false,
  compactSourceWidth,
  className,
  imageClassName,
}: ResponsiveImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const safeAlt = alt.trim() || "Изображение объекта";
  const failed = !asset || failedSource === asset.src;

  if (failed) {
    return (
      <div
        aria-label={`Изображение недоступно: ${safeAlt}`}
        className={`${styles.frame} ${styles.fallback} ${className ?? ""}`}
        role="img"
        style={{ aspectRatio: ratio }}
      >
        <ImageOff aria-hidden="true" size={30} strokeWidth={1.5} />
        <span>Изображение недоступно</span>
      </div>
    );
  }

  const avifSrcSet = buildSrcSet(asset.variants, "avif");
  const webpSrcSet = buildSrcSet(asset.variants, "webp");
  const compactAvif = compactSourceWidth === undefined ? undefined : asset.variants.find((variant) => (
    variant.format === "avif" && variant.width === compactSourceWidth
  ));
  const compactWebp = compactSourceWidth === undefined ? undefined : asset.variants.find((variant) => (
    variant.format === "webp" && variant.width === compactSourceWidth
  ));

  return (
    <picture className={`${styles.frame} ${className ?? ""}`} style={{ aspectRatio: ratio }}>
      {compactAvif && <source media="(max-width: 600px)" srcSet={compactAvif.url} type="image/avif" />}
      {compactWebp && <source media="(max-width: 600px)" srcSet={compactWebp.url} type="image/webp" />}
      {avifSrcSet && <source sizes={sizes} srcSet={avifSrcSet} type="image/avif" />}
      {webpSrcSet && <source sizes={sizes} srcSet={webpSrcSet} type="image/webp" />}
      <img
        alt={safeAlt}
        className={`${styles.image} ${imageClassName ?? ""}`}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        loading={eager ? "eager" : "lazy"}
        onError={() => setFailedSource(asset.src)}
        sizes={sizes}
        src={asset.src}
      />
    </picture>
  );
}
