import { z } from "zod";

export interface CompanyData {
  brand: "Офис продаж 76";
  legalName: "ООО «Ваш выбор»";
  inn: "7602067446";
  director: string;
  address: string;
  cityPhone: string;
  mobilePhone: string;
  email: string;
  telegramUrl: string;
  maxUrl: string;
  sourceCheckedAt: string;
}

export interface LegalDocument {
  kind: "privacy" | "consent";
  title: string;
  paragraphs: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  requiresLegalReview: true;
}

export const companyDataSchema = z.object({
  brand: z.literal("Офис продаж 76"),
  legalName: z.literal("ООО «Ваш выбор»"),
  inn: z.literal("7602067446"),
  director: z.string().min(1),
  address: z.string().min(1),
  cityPhone: z.string().min(1),
  mobilePhone: z.string().min(1),
  email: z.email(),
  telegramUrl: z.url(),
  maxUrl: z.url(),
  sourceCheckedAt: z.string().min(1),
});

export const legalDocumentSchema = z.object({
  kind: z.enum(["privacy", "consent"]),
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  sourceUrl: z.url(),
  sourceCheckedAt: z.string().min(1),
  requiresLegalReview: z.literal(true),
});

export const legalDocumentsSchema = z.array(legalDocumentSchema).length(2);
