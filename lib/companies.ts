import companiesDb from "@/companies_db.json";

export interface CompanyInfo {
  name: string;
  hrEmail: string;
  type: string;
  sector?: string;
  region?: string;
  country?: string;
  careersUrl?: string;
}

const companies = (companiesDb as any).companies || [];

const companyMap = new Map<string, CompanyInfo>();
for (const c of companies) {
  companyMap.set(c.name.toLowerCase(), {
    name: c.name,
    hrEmail: c.hrEmail,
    type: c.type,
    sector: c.sector,
    region: c.region,
    country: c.country,
    careersUrl: c.careers_url,
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Get the HR email for a company. Falls back to careers@[slug].com
 */
export function getCompanyHrEmail(companyName: string): string {
  const info = companyMap.get(companyName.toLowerCase());
  if (info?.hrEmail) return info.hrEmail;
  return `careers@${slugify(companyName)}.com`;
}

/**
 * Get the type/classification for a company.
 */
export function getCompanyType(companyName: string): string {
  const info = companyMap.get(companyName.toLowerCase());
  return info?.type || "tech";
}

/**
 * Get full company info if available.
 */
export function getCompanyInfo(companyName: string): CompanyInfo | null {
  return companyMap.get(companyName.toLowerCase()) || null;
}
