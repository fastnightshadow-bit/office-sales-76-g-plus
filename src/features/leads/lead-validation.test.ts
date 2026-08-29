import { describe, expect, it } from "vitest";
import { formatRussianPhoneInput, validateLead } from "./lead-validation";
import type { LeadDraft } from "./lead.types";

const baseDraft: LeadDraft = {
  name: "  Илья  ",
  phone: "+7 910 000-00-00",
  comment: "",
  consent: true,
  kind: "viewing",
};

describe("validateLead", () => {
  it("accepts a trimmed name and a formatted Russian phone", () => {
    expect(validateLead(baseDraft)).toEqual({});
  });

  it("accepts the common Russian 8-prefix phone format", () => {
    expect(validateLead({ ...baseDraft, phone: "8 (910) 000-00-00" })).toEqual({});
  });

  it("rejects a phone with fewer than ten national digits", () => {
    expect(validateLead({ ...baseDraft, phone: "+7 910 000-00" })).toMatchObject({
      phone: expect.any(String),
    });
  });

  it("rejects letters and excess phone digits", () => {
    expect(validateLead({ ...baseDraft, phone: "+7 910 000-00-0a" })).toMatchObject({
      phone: expect.any(String),
    });
    expect(validateLead({ ...baseDraft, phone: "+7 910 000-00-001" })).toMatchObject({
      phone: expect.any(String),
    });
  });

  it("requires a non-empty name and consent", () => {
    expect(validateLead({ ...baseDraft, name: "   ", consent: false })).toEqual({
      name: expect.any(String),
      consent: expect.any(String),
    });
  });

  it("keeps the optional comment out of validation errors", () => {
    expect(validateLead({ ...baseDraft, comment: "Хочу сравнить планировки" })).toEqual({});
  });
});

describe("formatRussianPhoneInput", () => {
  it.each([
    ["9100000000", "+7 (910) 000-00-00"],
    ["+79100000000", "+7 (910) 000-00-00"],
    ["89100000000", "+7 (910) 000-00-00"],
  ])("formats %s as the canonical Russian display value", (input, expected) => {
    expect(formatRussianPhoneInput(input)).toBe(expected);
  });

  it.each([
    ["+", "+"],
    ["+7", "+7"],
    ["8", "8"],
    ["9", "+7 (9"],
    ["91", "+7 (91"],
    ["910", "+7 (910)"],
    ["9100", "+7 (910) 0"],
    ["910000000", "+7 (910) 000-00-0"],
  ])("formats partial input %s progressively", (input, expected) => {
    expect(formatRussianPhoneInput(input)).toBe(expected);
  });

  it("ignores non-digits and caps the national number at ten digits", () => {
    expect(formatRussianPhoneInput("abc 910000000001 xyz")).toBe("+7 (910) 000-00-00");
  });

  it("supports controlled deletion from a completed value", () => {
    expect(formatRussianPhoneInput("+7 (910) 000-00-0")).toBe("+7 (910) 000-00-0");
    expect(formatRussianPhoneInput("+7 (910) 000-00-")).toBe("+7 (910) 000-00");
    expect(formatRussianPhoneInput("+7 (910) 000-0")).toBe("+7 (910) 000-0");
  });
});
