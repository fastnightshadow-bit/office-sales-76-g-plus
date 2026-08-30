import companyJson from "../../data/company.json";
import type { CompanyData } from "./company.types";

// The checked-in JSON is schema-validated by src/data/projects.test.ts. Runtime
// consumers can therefore stay type-only and avoid shipping the validator.
export const companyData = companyJson as CompanyData;
