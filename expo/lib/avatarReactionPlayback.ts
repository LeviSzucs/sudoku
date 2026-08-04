export interface AvatarReactionPlaybackTracker {
  claim: (reactionKey: string | null | undefined) => boolean;
  hasPlayed: (reactionKey: string) => boolean;
  clear: () => void;
}

export interface AvatarReactionPlaybackGate {
  prepare: (reactionKey: string | null | undefined) => void;
  consume: (reactionKey: string | null | undefined, canAnimate: boolean) => boolean;
}

export function createAvatarReactionPlaybackTracker(maxKeys = Number.POSITIVE_INFINITY): AvatarReactionPlaybackTracker {
  const played = new Set<string>();

  return {
    claim(reactionKey) {
      const key = reactionKey?.trim();
      if (!key || played.has(key)) return false;
      played.add(key);
      while (Number.isFinite(maxKeys) && played.size > maxKeys) {
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

export function createAvatarReactionPlaybackGate(
  claimPlayback: AvatarReactionPlaybackTracker["claim"] = claimAvatarReactionPlayback,
): AvatarReactionPlaybackGate {
  let currentKey: string | null = null;
  let claimed = false;
  let consumed = false;

  const prepare = (reactionKey: string | null | undefined) => {
    const key = reactionKey?.trim() || null;
    if (key === currentKey) return;
    currentKey = key;
    claimed = key ? claimPlayback(key) : false;
    consumed = false;
  };

  return {
    prepare,
    consume(reactionKey, canAnimate) {
      prepare(reactionKey);
      if (!currentKey || consumed) return false;
      consumed = true;
      return claimed && canAnimate;
    },
  };
}

