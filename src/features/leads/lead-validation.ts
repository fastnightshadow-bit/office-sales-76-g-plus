import type { LeadDraft, LeadErrors } from "./lead.types";

const phoneCharacters = /^[+\d\s().-]+$/;

/** Returns a canonical Russian phone number when the input has a valid shape. */
export function normalizeRussianPhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || !phoneCharacters.test(trimmed)) return undefined;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length !== 11) return undefined;

  const prefix = digits[0];
  if (prefix !== "7" && prefix !== "8") return undefined;
  return `+7${digits.slice(1)}`;
}

export function validateLead(input: LeadDraft): LeadErrors {
  const errors: LeadErrors = {};

  if (!input.name.trim()) {
    errors.name = "Введите имя";
  }

  if (!normalizeRussianPhone(input.phone)) {
    errors.phone = "Введите телефон в формате +7 900 000-00-00";
  }

  if (!input.consent) {
    errors.consent = "Нужно согласие на обработку персональных данных";
  }

  return errors;
}
