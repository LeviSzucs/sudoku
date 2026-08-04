# Avatar rendering foundation

## Current inventory

SudoDuel has one canonical public component, `expo/components/Avatar.tsx`, and one low-level inline-SVG renderer, `expo/components/AvatarRenderer.tsx`. There are no bitmap avatar assets, remote avatar URLs, blink timers, or alternative screen-specific renderers. `AvatarEditor` edits the existing character configuration and uses the same canonical component.

| Location | Current size | Context | Motion | Identity data |
| --- | ---: | --- | --- | --- |
| Home header | 48 px | `home` | Static | Signed-in profile |
| Own Profile | 84 px | `profile` | Idle while focused | Signed-in profile |
| Public profile | 104 px | `profile` | Forced static | Remote public profile |
| Versus Daily Duel | 84 px | `versus` / `matchmaking` | Focus-gated idle / thinking | Profile and remote opponent |
| Versus Ranked Duel | 56 px | `versus` / `matchmaking` | Focus-gated idle / thinking | Profile and remote opponent |
| Leaderboard podium | 84 / 56 px | `leaderboard` | Static | Remote public profile |
| Leaderboard rows | 44 px | `leaderboard` | Static | Remote public profile |
| Friend and request rows | 44 / 56 px | `friends` | Static | Remote profile |
| Search results | 44 px | `search` | Static | Remote search result |
| Friend challenges / H2H | 56 / 84 px | `friends` | Static | Remote profile |
| Username setup preview | 56 px | `home` | Static, decorative | Local draft |
| Avatar editor preview | 108 px | `profile` | Forced static, decorative | Local draft |

Notifications, share cards, `CompletionModal`, and `DuelResultReveal` do not currently render avatars. The `notification`, `share`, and `result` contexts exist so future consumers use the central policy instead of introducing another renderer.

## Current profile data

Profiles retain the legacy `initials`, `avatar_color`, and `avatar_symbol` values and the current `character_v1` fields: `avatar_style_version`, `avatar_bg_color`, `avatar_initials`, `avatar_skin_tone`, `avatar_hair_style`, `avatar_hair_color`, `avatar_top_style`, `avatar_top_color`, `avatar_accessory`, and `avatar_frame`.

Public profile, friend, challenge, ranked, and leaderboard contracts already expose the appropriate safe avatar subset. This foundation adds no columns and writes no replacement IDs. Existing values remain authoritative.

## API and registry

`expo/lib/avatarFoundation.ts` defines `AvatarAppearance`, independent `AvatarExpression` and `AvatarMotion` types, semantic `AvatarContext` values, and the resolved `AvatarPresentation`. The intended emotional presets are neutral + idle, happy + celebrate, sad + defeated, and focused + thinking. Reduced motion removes movement but keeps the expression.

The registry currently contains one stable character ID, `character_v1`, mapped to the existing inline renderer. Screens never store or import file paths. Registry validation rejects duplicate character IDs and unknown renderer references. Future art can replace or extend registry entries without changing screen consumers.

## Context and animation policy

`getAvatarPresentationForContext` is the single source of context defaults. `shouldAnimateAvatar` prevents animation in Home, leaderboard, friend, search, notification, and share contexts. Profile, Versus, matchmaking, and result contexts may animate when the caller is active.

The canonical component does not mount Reanimated hooks for static placements. Animated placements use a normal `Animated.View` around the character layer; SVG props are not animated. Backgrounds and frames remain fixed. There are no JavaScript timers, random schedules, subscriptions, or React frame-loop rerenders. Native animations are cancelled and reset on motion changes and unmount.

Own Profile and Versus pass screen focus through `active`. Losing focus disables and resets animation. Public Profile deliberately overrides animation because it is not the signed-in user's high-value Profile placement.

System reduced motion is read inside animated placements. An explicit override supports deterministic tests. Idle/thinking loops stop; one-shot reactions become static expressions. No blink system exists today, so there is no blink timer to manage.

## Compatibility and fallbacks

`resolveAvatarRenderModel` adapts current profile fields into the typed model. It preserves valid legacy colours and initials, maps current style/accessory/frame values through the existing item registry, and retains the legacy symbol fallback when a profile has no style version.

Missing, loading, guest, stale remote, unknown character, unknown layer, unsupported expression, unsupported motion, or removed future-asset values resolve to the stable `character_v1` default and known layer defaults. Unsupported expression becomes neutral. Unsupported animated motion uses idle only when supported; otherwise it is static. Invalid internal IDs are never displayed or announced.

Avatar accessibility is one identity-level image label where identity matters, such as "Opponent avatar". Decorative previews are removed from the accessibility tree. Layers, internal IDs, and motion names are never announced.

## Professional art delivery

Future layered art should share one coordinate system and anchor points. Recommended delivery:

- 1024 x 1024 master canvas for each character family.
- Transparent canvas with roughly 10-12% safe padding around the widest pose/accessory.
- Identical head, face, shoulder, and baseline anchors across expressions and outfits.
- Separate face/expression, body/outfit, accessory, background, frame, and effect layers.
- No baked-in backgrounds, shadows, or frames in character files.
- Stable lowercase snake-case IDs that do not encode a path or unlock rule.
- Consistent local SVG or lossless transparent raster exports after memory/decode testing.

```text
assets/avatars/
  characters/
  expressions/
  outfits/
  accessories/
  backgrounds/
  frames/
  effects/
```

Existing inline artwork should move only when real production art is imported and the registry can validate every reference.

## Future work

The next focused step is to import one professionally delivered layered character, validate alignment at all five sizes, and map expression assets without changing screen APIs. A later customisation project can define persistence for stable layer IDs, availability, unlock ownership, and migration from current value fields. Shops, currencies, inventories, and unlock rules do not belong in the renderer.

## Motion and reactions

The character layer alone moves; backgrounds and frames remain fixed.

- Idle uses neutral expression, sub-pixel vertical movement, and a maximum 0.6% scale change over a slow eased cycle.
- Matchmaking and unresolved opponent waits use focused expression and a slow 1.1-degree thinking tilt.
- Authoritative wins and successful solo completions use happy expression and one 660 ms lift/scale celebration.
- Authoritative losses use sad expression and one 700 ms downward settle/tilt.
- Draws, cancelled results, unresolved outcomes, failed saves, and unknown future outcomes are neutral and static.

`getAvatarReactionForOutcome`, `getOpponentAvatarReactionForOutcome`, and `getAvatarReactionForMatchState` are the pure mapping contract. The completion modal only reacts once its existing save/outcome state is safe. The Versus card uses completed duel IDs plus completion timestamps for player/opponent reaction keys. The game completion modal uses the existing completion key with a player suffix.

One-shot keys are claimed once per app session by a bounded 100-key tracker. Rerenders and revisiting an old result do not replay a reaction; a genuinely new result key can. Native animations cancel and reset on motion changes and unmount.

System Reduced Motion keeps happy, sad, focused, and neutral expressions but forces all motion static. Static contexts still do not mount animation hooks.

Current emotional placements are own Profile, Daily/Ranked Versus and matchmaking, and the game completion modal for Classic, Daily, Daily Duel, Ranked, and Friend Challenge flows. Home, public profiles, leaderboards, friends/search rows, notifications, compact cards, and editor previews remain static.

The inline renderer can make restrained brow and mouth changes for all four expressions. Professional art should later provide aligned eye, brow, and mouth layers for each expression, plus consistent character anchors, so stronger expression fidelity does not require changing screen APIs or animation policy.
