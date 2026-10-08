export const POLICY_VERSION = '2026-10-08';
export const PAST_POLICY_VERSIONS = ['2026-09-09'];
export const POLICY_CHANGES = ['Ranked rounds are recorded for replays and deleted after 5 days.', 'We keep a log of account activity for 180 days.', "We record which accounts use the same PC, browser, or internet connection to enforce bans. Other accounts on a banned player's PC or browser can be banned automatically."];
export const knownPolicy = version => version === POLICY_VERSION || PAST_POLICY_VERSIONS.includes(version);
export const POLICY_DATE = 'October 8, 2026';
export const PROJECT_NAME = 'Whys Code';
export const CONTACT_EMAIL = 'contact@rankedworld.com';
export function acceptsPolicy(body) { return body?.accepted === true && knownPolicy(body?.policyVersion); }
