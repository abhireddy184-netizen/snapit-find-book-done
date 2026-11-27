import { catalog } from './catalog';

export type SetupDraft = {
  full_name: string; phone: string; business_name: string; business_type: 'individual' | 'registered_business';
  category_slugs: string[]; service_slugs: string[]; service_area: string; service_zip: string;
  service_radius_miles: number | null; bio: string; trade_license_required: boolean;
  /** Free-text service not in the catalog ("Other services"). */
  other_service_description?: string;
};

export function requiredSetupDocuments(_draft: Pick<SetupDraft, 'business_type' | 'trade_license_required'>): string[] {
  // Initial profile review is independent of credentials needed for particular work.
  return [];
}

export function missingSetupItems(draft: SetupDraft, docs: Array<{ doc_type: string; status: string }>, opts: { otherSelected?: boolean } = {}): string[] {
  const missing: string[] = [];
  if (draft.full_name.trim().length < 2) missing.push('Name');
  if (draft.phone.replace(/\D/g, '').length < 10) missing.push('Phone number');
  if (draft.business_name.trim().length < 2) missing.push('Business or professional name');
  const other = (draft.other_service_description ?? '').trim();
  const listedValid = draft.service_slugs.every(s => catalog.some(c => draft.category_slugs.includes(c.slug) && c.services.some(v => v.slug === s)));
  const hasListed = draft.category_slugs.length > 0 && draft.service_slugs.length > 0;
  if (!listedValid || (!hasListed && other.length < 2)) missing.push('Services');
  if (opts.otherSelected && other.length < 2) missing.push('Describe your service (Other services)');
  if (!draft.service_area.trim()) missing.push('Service city');
  if (!/^\d{5}$/.test(draft.service_zip)) missing.push('5-digit service ZIP');
  if (!draft.service_radius_miles || draft.service_radius_miles < 1 || draft.service_radius_miles > 200) missing.push('Service radius (1–200 miles)');
  for (const type of requiredSetupDocuments(draft)) if (!docs.some(d => d.doc_type === type && ['pending', 'accepted'].includes(d.status))) missing.push(type.replaceAll('_', ' '));
  return missing;
}

export function setupRemindersAllowed(state: string, verification: string): boolean {
  return state === 'pending_setup' && verification === 'unverified';
}
/**
 * True while a Pro still has setup to finish: not yet submitted for review and
 * not already pending or approved. Mirrors the "pending / approved" checks on
 * the setup page so the two never disagree. A missing setup row counts as
 * incomplete only for an unreviewed pro.
 */
export function isProviderSetupIncomplete(setupState: string | null | undefined, verification: string | null | undefined): boolean {
  if (verification === 'verified' || verification === 'pending') return false;
  if (setupState === 'under_verification') return false;
  return setupState == null || setupState === 'pending_setup';
}
