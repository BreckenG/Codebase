export const POLICY_VERSION = '2026-10-12b';
export const PAST_POLICY_VERSIONS = ['2026-09-09', '2026-10-08', '2026-10-09', '2026-10-11', '2026-10-12'];
export const POLICY_CHANGES = ['To find alternate accounts of banned players we now use more information: details of your browser, PC and VR hardware, the Steam accounts used on your PC, your Discord email, connected accounts and servers, a card identifier from Stripe, your internet provider and rough location, and how accounts play.', 'In ranked codes we now keep a voice signature and a few short clips of your voice for the same purpose. You are asked to agree to this again before joining ranked codes.', 'We keep the names of very small Discord servers you are in (15 members or fewer) so staff can see when you share one with a banned account.', 'Sign in now asks Discord for your email, connected accounts and server list. Your Discord account must be at least 3 days old to connect, and connecting starts on the website or the launcher.'];
export const knownPolicy = version => version === POLICY_VERSION || PAST_POLICY_VERSIONS.includes(version);
export const POLICY_DATE = 'October 12, 2026';
export const PROJECT_NAME = 'Whys Code';
export const CONTACT_EMAIL = 'contact@rankedworld.com';
export function acceptsPolicy(body) { return body?.accepted === true && knownPolicy(body?.policyVersion); }
