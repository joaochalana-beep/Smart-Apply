import { CONFIG } from "./config";

/**
 * Auto-generate an @applywise.site email address from the user's full name.
 * Examples:
 *   "João Chalana" → joao.chalana@applywise.site
 *   "Maria Silva"  → maria.silva@applywise.site
 */
export function generateUserEmail(name: string): string {
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${clean}@${CONFIG.domain}`;
}

/**
 * Ensure a profile object has an applywise email. If missing, generate it from full_name.
 */
export function ensureApplyWiseEmail(profile: Record<string, any>): Record<string, any> {
  if (profile?.applywise_email) return profile;
  const name = profile?.full_name || profile?.name || "";
  if (!name.trim()) return profile;
  return { ...profile, applywise_email: generateUserEmail(name) };
}
