export const POLICY_VERSION = '2026-10-21';
export const PAST_POLICY_VERSIONS = ['2026-09-09', '2026-10-08', '2026-10-09', '2026-10-11', '2026-10-12', '2026-10-12b'];
export const POLICY_CHANGES = ['Ranked voice chat is only transcribed and voice matched for players who agreed, and you can now withdraw that agreement in Settings.', 'A match in how two accounts play or sound is only ever sent to staff for review, never an automatic ban.', 'Network details are now stored only in scrambled form.', 'Anti-cheat also runs in scrims, and anti-cheat clips are only seen by staff.', 'Pro members and players using a weekly peek can see who is in a ranked code.', 'You can subscribe through Discord, and the launcher can show your rank in your Discord status.'];
export const knownPolicy = version => version === POLICY_VERSION || PAST_POLICY_VERSIONS.includes(version);
export const POLICY_DATE = 'October 21, 2026';
export const PROJECT_NAME = 'Whys Code';
export const CONTACT_EMAIL = 'contact@rankedworld.com';
export function acceptsPolicy(body) { return body?.accepted === true && knownPolicy(body?.policyVersion); }
