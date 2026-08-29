import { describe, expect, it } from "vitest";
import { validateLead } from "./lead-validation";
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
