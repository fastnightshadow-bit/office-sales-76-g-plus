import { Menu, Phone, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import companyJson from "../../data/company.json";
import { companyDataSchema } from "../../features/company/company.types";
import styles from "./SiteHeader.module.css";

const company = companyDataSchema.parse(companyJson);
const cityPhoneHref = `tel:+${company.cityPhone.replace(/\D/g, "")}`;

const navigation = [
  { label: "Главная", to: "/", end: true },
  { label: "Каталог", to: "/catalog", end: false },
  { label: "О компании", to: "/about", end: false },
  { label: "Контакты", to: "/contacts", end: false },
] as const;

interface SiteHeaderProps {
  mode?: "overlay" | "solid";
  /** Keeps the mobile trigger available in DOM-based interaction tests. */
  forceMobileForTest?: boolean;
}

interface InertSnapshot {
  element: HTMLElement;
  inert: boolean;
  hadInertAttribute: boolean;
  ariaHidden: string | null;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

export function SiteHeader({
  mode = "solid",
  forceMobileForTest = false,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const menuId = useId();
  const location = useLocation();
  const locationSignature = `${location.key}:${location.pathname}:${location.search}:${location.hash}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const previousLocationSignatureRef = useRef(locationSignature);

  const closeMenu = (restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setMenuOpen(false);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    const element = document.createElement("div");
    element.dataset.mobileMenuPortal = "";
    document.body.append(element);
    setPortalElement(element);

    return () => {
      element.remove();
    };
  }, []);

  useEffect(() => {
    if (previousLocationSignatureRef.current === locationSignature) return;

    previousLocationSignatureRef.current = locationSignature;
    closeMenu(false);
  }, [locationSignature]);

  useEffect(() => {
    if (menuOpen) {
      wasOpenRef.current = true;
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (!restoreFocusRef.current) return;

      restoreFocusRef.current = false;
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger) && !trigger.disabled) trigger.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const closeForDesktop = (matches: boolean) => {
      if (!matches) return;
      closeMenu(false);
    };
    const onChange = (event: MediaQueryListEvent) => closeForDesktop(event.matches);

    closeForDesktop(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
    } else {
      mediaQuery.addListener?.(onChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", onChange);
      } else {
        mediaQuery.removeListener?.(onChange);
      }
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !portalElement || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const inertSnapshots: InertSnapshot[] = [];

    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portalElement) continue;
      inertSnapshots.push({
        element: child,
        inert: child.inert,
        hadInertAttribute: child.hasAttribute("inert"),
        ariaHidden: child.getAttribute("aria-hidden"),
      });
      child.inert = true;
      child.setAttribute("inert", "");
      child.setAttribute("aria-hidden", "true");
    }

    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = dialog ? getFocusableElements(dialog) : [];
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;
      const currentFocusable = getFocusableElements(dialog);
      const first = currentFocusable[0];
      const last = currentFocusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const snapshot of inertSnapshots) {
        snapshot.element.inert = snapshot.inert;
        if (!snapshot.hadInertAttribute) snapshot.element.removeAttribute("inert");
        if (snapshot.ariaHidden === null) {
          snapshot.element.removeAttribute("aria-hidden");
        } else {
          snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden);
        }
      }
    };
  }, [menuOpen, portalElement]);

  const mobileDialog = menuOpen && portalElement
    ? createPortal(
        <div
          className={styles.mobileBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenu();
          }}
        >
          <div
            aria-labelledby={`${menuId}-title`}
            aria-modal="true"
            className={styles.mobileDialog}
            id={menuId}
            ref={dialogRef}
            role="dialog"
          >
            <div className={styles.mobileDialogHeader}>
              <p className={styles.dialogTitle} id={`${menuId}-title`}>
                Навигация
              </p>
              <button
                aria-label="Закрыть меню"
                className={styles.iconButton}
                onClick={() => closeMenu()}
                type="button"
              >
                <X aria-hidden="true" size={24} strokeWidth={1.8} />
              </button>
            </div>

            <nav aria-label="Мобильная навигация" className={styles.mobileNav}>
              {navigation.map((item) => (
                <NavLink
                  className={({ isActive }) => isActive ? styles.mobileLinkActive : styles.mobileLink}
                  end={item.end}
                  key={item.label}
                  onClick={() => closeMenu(false)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className={styles.mobileContact}>
              <span>Ответим и поможем с выбором</span>
              <a href={cityPhoneHref}>
                <Phone aria-hidden="true" size={20} />
                {company.cityPhone}
              </a>
            </div>
          </div>
        </div>,
        portalElement,
      )
    : null;

  return (
    <>
      <header
        className={`${styles.header} ${mode === "overlay" ? styles.overlay : styles.solid} ${forceMobileForTest ? styles.forceMobile : ""}`}
      >
        <div className={`container ${styles.inner}`}>
          <Link aria-label="Офис продаж 76 — главная" className={styles.brand} to="/">
            <span className={styles.brandMark}>76</span>
            <span className={styles.brandText}>Офис продаж</span>
          </Link>

          <nav aria-label="Основная навигация" className={styles.desktopNav}>
            {navigation.slice(1).map((item) => (
              <NavLink
                className={({ isActive }) => isActive ? styles.desktopLinkActive : styles.desktopLink}
                key={item.label}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <a className={styles.consultationLink} href={cityPhoneHref}>
            Консультация
          </a>

          <button
            aria-controls={menuId}
            aria-expanded={menuOpen}
            aria-label="Открыть меню"
            className={styles.menuButton}
            onClick={() => setMenuOpen(true)}
            ref={triggerRef}
            type="button"
          >
            <Menu aria-hidden="true" size={25} strokeWidth={1.8} />
          </button>
        </div>
      </header>
      {mobileDialog}
    </>
  );
}
