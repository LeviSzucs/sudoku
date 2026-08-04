
const MAX_REACTION_KEYS = 100;

export interface AvatarReactionPlaybackTracker {
  claim: (reactionKey: string | null | undefined) => boolean;
  hasPlayed: (reactionKey: string) => boolean;
  clear: () => void;
}

export function createAvatarReactionPlaybackTracker(maxKeys = MAX_REACTION_KEYS): AvatarReactionPlaybackTracker {
  const played = new Set<string>();

  return {
    claim(reactionKey) {
      const key = reactionKey?.trim();
      if (!key || played.has(key)) return false;
      played.add(key);
      while (played.size > maxKeys) {
        const oldest = played.values().next().value as string | undefined;
        if (!oldest) break;
        played.delete(oldest);
      }
      return true;
    },
    hasPlayed(reactionKey) {
      return played.has(reactionKey);
    },
    clear() {
      played.clear();
    },
  };
}

const appSessionReactionTracker = createAvatarReactionPlaybackTracker();

export function claimAvatarReactionPlayback(reactionKey: string | null | undefined): boolean {
  return appSessionReactionTracker.claim(reactionKey);
}

