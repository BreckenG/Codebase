export function loginReturnPath(value) {
  if (typeof value !== 'string') return null;
  if (/^\/launcher\/connect\?code=[A-HJ-NP-Z2-9]{8}$/.test(value)) return value;
  if (value === '/subscribe') return value;
  const referral = /^\/subscribe\?ref=([a-zA-Z0-9]{3,20})$/.exec(value);
  return referral ? `/subscribe?ref=${referral[1].toUpperCase()}` : null;
}
