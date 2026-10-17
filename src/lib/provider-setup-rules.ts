import { catalog } from './catalog';

export type SetupDraft = {
  full_name: string; phone: string; business_name: string; business_type: 'individual' | 'registered_business';
  category_slugs: string[]; service_slugs: string[]; service_area: string; service_zip: string;
  service_radius_miles: number | null; bio: string; trade_license_required: boolean;
};

export function requiredSetupDocuments(draft: Pick<SetupDraft, 'business_type' | 'trade_license_required'>): string[] {
  return ['liability_insurance', ...(draft.business_type === 'registered_business' ? ['business_registration'] : []), ...(draft.trade_license_required ? ['trade_license'] : [])];
}

export function missingSetupItems(draft: SetupDraft, docs: Array<{ doc_type: string; status: string }>): string[] {
  const missing: string[] = [];
  if (draft.full_name.trim().length < 2) missing.push('Name');
  if (draft.phone.replace(/\D/g, '').length < 10) missing.push('Phone number');
  if (draft.business_name.trim().length < 2) missing.push('Business or professional name');
  if (!draft.category_slugs.length || !draft.service_slugs.length || draft.service_slugs.some(s => !catalog.some(c => draft.category_slugs.includes(c.slug) && c.services.some(v => v.slug === s)))) missing.push('Services');
  if (!draft.service_area.trim()) missing.push('Service city');
  if (!/^\d{5}$/.test(draft.service_zip)) missing.push('5-digit service ZIP');
  if (!draft.service_radius_miles || draft.service_radius_miles < 1 || draft.service_radius_miles > 200) missing.push('Service radius (1–200 miles)');
  for (const type of requiredSetupDocuments(draft)) if (!docs.some(d => d.doc_type === type && ['pending', 'accepted'].includes(d.status))) missing.push(type.replaceAll('_', ' '));
  return missing;
}

export function setupRemindersAllowed(state: string, verification: string): boolean {
  return state === 'pending_setup' && verification === 'unverified';
}