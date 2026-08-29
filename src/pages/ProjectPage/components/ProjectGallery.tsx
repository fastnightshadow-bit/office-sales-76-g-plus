import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ResponsiveImage } from "../../../components/ResponsiveImage/ResponsiveImage";
import type { ImageAsset } from "../../../features/catalog/catalog.types";
import styles from "../ProjectPage.module.css";

interface ProjectGalleryProps {
  images: ImageAsset[];
  title: string;
}

function snapshotBodyChild(element: HTMLElement) {
  return {
    element,
    inert: element.inert,
    hadInert: element.hasAttribute("inert"),
    ariaHidden: element.getAttribute("aria-hidden"),
  };
}

export function ProjectGallery({ images, title }: ProjectGalleryProps) {
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const restoreIndexRef = useRef<number | null>(null);
  const open = activeIndex !== null;

  useEffect(() => {
    const element = document.createElement("div");
    element.dataset.projectGalleryPortal = "";
    document.body.append(element);
    setPortalElement(element);
    return () => element.remove();
  }, []);

  useEffect(() => {
    if (!open || !portalElement) return;
    const previousOverflow = document.body.style.overflow;
    const snapshots = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== portalElement)
      .map(snapshotBodyChild);
    snapshots.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveIndex(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => current === null ? null : (current + 1) % images.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
      } else if (event.key === "Tab" && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      snapshots.forEach(({ element, inert, hadInert, ariaHidden }) => {
        element.inert = inert;
        if (hadInert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      const restoreIndex = restoreIndexRef.current;
      if (restoreIndex !== null) triggerRefs.current[restoreIndex]?.focus();
    };
  }, [images.length, open, portalElement]);

  if (images.length === 0) return null;

  const openImage = (index: number) => {
    restoreIndexRef.current = index;
    setActiveIndex(index);
  };
  const close = () => setActiveIndex(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  return (
    <>
      <section className={styles.section} id="photos">
        <div className="container">
          <div className={styles.sectionHeading}>
            <p>{images.length} {images.length === 1 ? "фотография" : "фотографии"}</p>
            <h2>Фотографии</h2>
          </div>
          <div className={styles.galleryGrid}>
            {images.map((image, index) => (
              <button
                aria-label={`Открыть фотографию ${index + 1} из ${images.length}`}
                className={styles.galleryButton}
                key={image.src}
                onClick={() => openImage(index)}
                ref={(element) => { triggerRefs.current[index] = element; }}
                type="button"
              >
                <ResponsiveImage
                  alt={`${title}, фотография ${index + 1} из ${images.length}`}
                  asset={image}
                  imageClassName={styles.galleryImage!}
                  ratio={index === 0 ? "16 / 10" : "4 / 3"}
                  sizes={index === 0 ? "(max-width: 767px) calc(100vw - 40px), 65vw" : "(max-width: 767px) calc(50vw - 24px), 32vw"}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {open && portalElement && activeImage ? createPortal(
        <div className={styles.galleryBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className={styles.galleryDialog}
            ref={dialogRef}
            role="dialog"
          >
            <h2 className="visually-hidden" id={titleId}>Фотографии {title}</h2>
            <button aria-label="Закрыть галерею" className={styles.galleryClose} onClick={close} type="button">
              <X aria-hidden="true" size={24} />
            </button>
            <div className={styles.galleryStage}>
              <ResponsiveImage
                alt={`${title}, фотография ${activeIndex + 1} из ${images.length}`}
                asset={activeImage}
                eager
                imageClassName={styles.galleryModalImage!}
                ratio="16 / 10"
                sizes="100vw"
              />
            </div>
            <p className={styles.galleryCounter}>{activeIndex + 1} / {images.length}</p>
            {images.length > 1 ? (
              <>
                <button
                  aria-label="Предыдущая фотография"
                  className={`${styles.galleryArrow} ${styles.galleryPrevious}`}
                  onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={24} />
                </button>
                <button
                  aria-label="Следующая фотография"
                  className={`${styles.galleryArrow} ${styles.galleryNext}`}
                  onClick={() => setActiveIndex((activeIndex + 1) % images.length)}
                  type="button"
                >
                  <ArrowRight aria-hidden="true" size={24} />
                </button>
              </>
            ) : null}
          </div>
        </div>,
        portalElement,
      ) : null}
    </>
  );
}
