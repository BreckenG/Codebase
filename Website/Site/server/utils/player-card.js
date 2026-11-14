import { tierForElo } from '@ranked-world/ranks';
import { defaultDiscordAvatar, discordAvatarUrl } from '../../app/utils/avatar.js';
export function cardProfile(profile = {}, position = null) {
  const ranked = profile.ranked || {};
  const tier = tierForElo(ranked.elo || 0);
  return { discordName: profile.username || 'Unknown player', gameName: profile.linked ? profile.name || 'Unknown' : 'Not connected', avatar: discordAvatarUrl(profile.avatar) || defaultDiscordAvatar(profile.discordId), rank: tier.name, percent: tier.percent, isTop: tier.isTop, position, elo: ranked.elo || 0, wins: ranked.wins || 0, rounds: ranked.roundsPlayed || 0, tags: ranked.tags || 0, runtime: ranked.survivalSeconds || 0, winStreak: ranked.winStreak || 0 };
}
