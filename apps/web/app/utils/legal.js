export const POLICY_VERSION = '2026-09-09';
export const POLICY_DATE = 'October 1, 2026';
export const PROJECT_NAME = 'Whys Code';
export const CONTACT_EMAIL = 'contact@rankedworld.com';
export function acceptsPolicy(body) { return body?.accepted === true && body?.policyVersion === POLICY_VERSION; }
