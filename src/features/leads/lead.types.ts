export type LeadKind = "selection" | "callback" | "viewing";

export interface LeadDraft {
  name: string;
  phone: string;
  comment: string;
  consent: boolean;
  kind: LeadKind;
  projectTitle?: string;
}

export type LeadErrors = Partial<Record<"name" | "phone" | "consent", string>>;
