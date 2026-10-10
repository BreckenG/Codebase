const VOICE_VERSION = "2026-10-12";
const voiceAccepted = (doc) => {
  const v = doc && doc.acceptance && doc.acceptance.voice;
  return !!(v && v.version === VOICE_VERSION && v.at && !v.revokedAt);
};
module.exports = { VOICE_VERSION, voiceAccepted };
