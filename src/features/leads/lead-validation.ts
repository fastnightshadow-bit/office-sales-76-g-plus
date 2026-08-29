import type { LeadDraft, LeadErrors } from "./lead.types";

const phoneCharacters = /^[+\d\s().-]+$/;
const russianCountryCode = "7";
const russianTrunkPrefix = "8";

function getRussianNationalDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  const startsWithPlus = /^\s*\+/.test(value);
  const hasRussianTrunkPrefix = digits.startsWith(russianTrunkPrefix) && !startsWithPlus;
  const hasRussianCountryPrefix = digits.startsWith(russianCountryCode) && (startsWithPlus || digits.length === 11);

  if (hasRussianTrunkPrefix || hasRussianCountryPrefix) return digits.slice(1);
  return digits;
}

function formatNationalDigits(digits: string): string {
  const national = digits.slice(0, 10);
  if (!national) return "";

  let formatted = "+7";
  formatted += ` (${national.slice(0, 3)}`;
  if (national.length >= 3) formatted += ")";
  if (national.length > 3) formatted += ` ${national.slice(3, 6)}`;
  if (national.length > 6) formatted += `-${national.slice(6, 8)}`;
  if (national.length > 8) formatted += `-${national.slice(8, 10)}`;
  return formatted;
}

/** Formats any pasted or typed value as a canonical Russian phone display value. */
export function formatRussianPhoneInput(value: string): string {
  const trimmed = value.trimStart();
  const digits = value.replace(/\D/g, "");
  const hasPlus = trimmed.startsWith("+");

  // Preserve an incomplete prefix while the user is entering it. Once a
  // national digit is present, the value immediately switches to the mask.
  if (!digits) return hasPlus ? "+" : "";
  if (hasPlus && digits === "7") return "+7";
  if (!hasPlus && digits.length === 1 && (digits === "7" || digits === "8")) return digits;

  return formatNationalDigits(getRussianNationalDigits(value));
}

/** Returns a canonical Russian phone number when the input has a valid shape. */
export function normalizeRussianPhone(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || !phoneCharacters.test(trimmed)) return undefined;

  const digits = trimmed.replace(/\D/g, "");
  const nationalDigits = getRussianNationalDigits(trimmed);
  if (nationalDigits.length !== 10) return undefined;
  if (digits.length === 10) return `+7${nationalDigits}`;
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${nationalDigits}`;
  }
  return undefined;
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
