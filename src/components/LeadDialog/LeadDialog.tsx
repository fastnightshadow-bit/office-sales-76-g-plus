import { X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { formatRussianPhoneInput, validateLead } from "../../features/leads/lead-validation";
import type { LeadDraft, LeadErrors, LeadKind } from "../../features/leads/lead.types";
import { Button } from "../Button/Button";
import styles from "./LeadDialog.module.css";

export interface LeadDialogProps {
  open: boolean;
  kind: LeadKind;
  projectTitle?: string;
  onClose: () => void;
}

interface LeadCopy {
  title: string;
  eyebrow: string;
  description: string;
}

const copyByKind: Record<LeadKind, LeadCopy> = {
  selection: {
    title: "Получить подборку",
    eyebrow: "Подбор объектов",
    description: "Оставьте контакты, чтобы мы подготовили удобную подборку для сравнения.",
  },
  callback: {
    title: "Заказать звонок",
    eyebrow: "Обратный звонок",
    description: "Оставьте контакты, чтобы обсудить вопросы по объектам и следующий шаг.",
  },
  viewing: {
    title: "Записаться на показ",
    eyebrow: "Показ объекта",
    description: "Оставьте контакты, чтобы обсудить удобное время показа.",
  },
};

const MAX_COMMENT_LENGTH = 500;

function makeDraft(kind: LeadKind, projectTitle?: string): LeadDraft {
  const draft: LeadDraft = {
    name: "",
    phone: "",
    comment: "",
    consent: false,
    kind,
  };
  if (projectTitle) draft.projectTitle = projectTitle;
  return draft;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
    ),
  ).filter((element) => !element.hasAttribute("hidden"));
}

function getBodyChildSnapshot(element: HTMLElement) {
  return {
    element,
    inert: element.inert,
    hadInertAttribute: element.hasAttribute("inert"),
    ariaHidden: element.getAttribute("aria-hidden"),
  };
}

export function LeadDialog({ open, kind, projectTitle, onClose }: LeadDialogProps) {
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<LeadDraft>(() => makeDraft(kind, projectTitle));
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const errorSummaryId = useId();
  const nameErrorId = `${titleId}-name-error`;
  const phoneErrorId = `${titleId}-phone-error`;
  const consentErrorId = `${titleId}-consent-error`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const copy = copyByKind[kind];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const element = document.createElement("div");
    element.dataset.leadDialogPortal = "";
    document.body.append(element);
    setPortalElement(element);
    return () => element.remove();
  }, []);

  useEffect(() => {
    if (kind === draft.kind && projectTitle === draft.projectTitle) return;
    setDraft((current) => {
      const next: LeadDraft = { ...current, kind };
      if (projectTitle) next.projectTitle = projectTitle;
      else delete next.projectTitle;
      return next;
    });
  }, [draft.kind, draft.projectTitle, kind, projectTitle]);

  const restoreTriggerFocus = () => {
    const trigger = triggerRef.current;
    if (trigger && document.contains(trigger) && !trigger.hasAttribute("disabled")) {
      trigger.focus();
    }
    triggerRef.current = null;
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      if (!wasOpenRef.current) {
        const active = document.activeElement;
        if (active instanceof HTMLElement && !portalElement?.contains(active)) {
          triggerRef.current = active;
        }
      }
      wasOpenRef.current = true;
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      setDraft(makeDraft(kind, projectTitle));
      setErrors({});
      setSubmitted(false);
    }
  }, [kind, open, portalElement, projectTitle]);

  useEffect(() => {
    if (!open || !portalElement || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const snapshots = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== portalElement)
      .map(getBodyChildSnapshot);

    for (const snapshot of snapshots) {
      snapshot.element.inert = true;
      snapshot.element.setAttribute("inert", "");
      snapshot.element.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDraft(makeDraft(kind, projectTitle));
        setErrors({});
        setSubmitted(false);
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = getFocusableElements(dialogRef.current);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      for (const snapshot of snapshots) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.hadInertAttribute) snapshot.element.setAttribute("inert", "");
        else snapshot.element.removeAttribute("inert");
        if (snapshot.ariaHidden === null) snapshot.element.removeAttribute("aria-hidden");
        else snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden);
      }
      restoreTriggerFocus();
    };
  }, [open, portalElement]);

  useEffect(() => {
    if (!open || !portalElement) return;
    if (submitted) {
      dialogRef.current?.querySelector<HTMLButtonElement>('button[type="button"]')?.focus();
    } else {
      nameRef.current?.focus();
    }
  }, [open, portalElement, submitted]);

  const closeDialog = () => {
    setDraft(makeDraft(kind, projectTitle));
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateLead(draft);
    setErrors(nextErrors);
    if (nextErrors.name) nameRef.current?.focus();
    else if (nextErrors.phone) phoneRef.current?.focus();
    else if (nextErrors.consent) {
      dialogRef.current?.querySelector<HTMLInputElement>("#lead-consent")?.focus();
    } else {
      setSubmitted(true);
    }
  };

  const updateField = (field: keyof Pick<LeadDraft, "name" | "phone" | "comment">, value: string) => {
    const nextValue = field === "comment"
      ? value.slice(0, MAX_COMMENT_LENGTH)
      : field === "phone"
        ? formatRussianPhoneInput(value)
        : value;
    setDraft((current) => ({ ...current, [field]: nextValue }));
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field as "name" | "phone"];
        return next;
      });
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setDraft((current) => ({ ...current, consent: checked }));
    if (checked) {
      setErrors((current) => {
        const next = { ...current };
        delete next.consent;
        return next;
      });
    }
  };

  if (!open || !portalElement) return null;

  const dialog = (
    <div
      aria-hidden="false"
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.eyebrow}>{copy.eyebrow}</span>
          <button aria-label="Закрыть" className={styles.closeButton} onClick={closeDialog} type="button">
            <X aria-hidden="true" size={22} strokeWidth={1.8} />
          </button>
        </div>

        {submitted ? (
          <div className={styles.success} role="status">
            <span aria-hidden="true" className={styles.successMark}>✓</span>
            <h2 id={titleId}>Демо-форма проверена</h2>
            <p>
              После согласования заявка будет отправляться в вашу CRM или мессенджер. Сейчас данные никуда не отправляются и не сохраняются.
            </p>
            <Button onClick={closeDialog} type="button">Закрыть результат</Button>
          </div>
        ) : (
          <>
            <div className={styles.headingGroup}>
              <h2 id={titleId}>{copy.title}</h2>
              <p id={descriptionId}>
                {copy.description}{projectTitle ? ` Объект: ${projectTitle}.` : ""}
                {" "}Это локальная демо-форма: данные никуда не отправляются и не сохраняются.
              </p>
            </div>

            {Object.keys(errors).length > 0 ? (
              <div aria-describedby={errorSummaryId} aria-live="assertive" className={styles.errorSummary} id={errorSummaryId} role="alert">
                Проверьте поля формы и исправьте отмеченные ошибки.
              </div>
            ) : null}

            <form noValidate onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label htmlFor="lead-name">Имя</label>
                <input
                  aria-describedby={errors.name ? nameErrorId : undefined}
                  aria-invalid={errors.name ? "true" : undefined}
                  autoComplete="name"
                  id="lead-name"
                  onChange={(event) => updateField("name", event.target.value)}
                  ref={nameRef}
                  type="text"
                  value={draft.name}
                />
                {errors.name ? <span className={styles.fieldError} id={nameErrorId}>{errors.name}</span> : null}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="lead-phone">Телефон</label>
                <input
                  aria-describedby={errors.phone ? phoneErrorId : undefined}
                  aria-invalid={errors.phone ? "true" : undefined}
                  autoComplete="tel"
                  id="lead-phone"
                  inputMode="tel"
                  onChange={(event) => updateField("phone", event.target.value)}
                  ref={phoneRef}
                  type="tel"
                  value={draft.phone}
                />
                {errors.phone ? <span className={styles.fieldError} id={phoneErrorId}>{errors.phone}</span> : null}
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="lead-comment">Комментарий <span>(необязательно)</span></label>
                <textarea
                  id="lead-comment"
                  maxLength={MAX_COMMENT_LENGTH}
                  onChange={(event) => updateField("comment", event.target.value)}
                  rows={3}
                  value={draft.comment}
                />
                <span className={styles.fieldHint}>До {MAX_COMMENT_LENGTH} символов</span>
              </div>

              <label className={styles.consent} htmlFor="lead-consent">
                <input
                  aria-label="Согласие на обработку персональных данных"
                  aria-describedby={errors.consent ? consentErrorId : undefined}
                  aria-invalid={errors.consent ? "true" : undefined}
                  checked={draft.consent}
                  id="lead-consent"
                  onChange={(event) => handleConsentChange(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  Соглашаюсь с <a href="/consent" onClick={closeDialog}>обработкой персональных данных</a>
                </span>
              </label>
              {errors.consent ? <span className={styles.fieldError} id={consentErrorId}>{errors.consent}</span> : null}

              <Button fullWidth size="large" type="submit">Проверить заявку</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, portalElement);
}
