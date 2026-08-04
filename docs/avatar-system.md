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
| Avatar editor preview | 122 / 160 px | `share` | Static, decorative | Local draft |

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

## Avatar editor

The own Profile avatar is the primary edit entry point; Settings > Account > Avatar remains available as a secondary settings route. Public profiles remain read-only. Guests keep the existing local-profile save behavior, while signed-in users use the existing authoritative profile update.

The editor is organised into Appearance, Hair, Outfit, Accessories, Background, and Frame. These categories expose only the currently persisted fields:

- Appearance: initials fallback and skin tone.
- Hair: style and colour.
- Outfit: top style and colour.
- Accessories: accessory, including None.
- Background: avatar background colour.
- Frame: frame, including None.

`expo/lib/avatarEditor.ts` owns the category order, option groups, draft creation, initials sanitisation, field updates, accessibility labels, and explicit dirty-state comparison. Opening the editor copies the current persisted avatar into a local draft. Option changes never write to the profile. Cancel restores the persisted snapshot; dismissing a dirty editor asks before discarding. Save writes the complete supported configuration once through `updateAvatar`, remains disabled when unchanged or already saving, preserves the draft after failure, and closes only after success.

The main preview and option thumbnails use the canonical `Avatar` with neutral expression, static motion, and decorative accessibility. Unknown or retired persisted values remain in the draft and render through the normal safe fallback until the player explicitly selects a replacement. Legacy initials, colour, and symbol values are not silently cleared.

The current catalogue still uses the existing inline character and several visually similar colour/style choices. User-facing labels may improve without changing stable IDs. Professional art can replace registry-backed previews later. Unlock ownership, rewards, shops, currencies, and inventory remain deliberately outside the editor and require a separate product and persistence design.

## Rendering polish and layer ownership

The canonical renderer owns the avatar's single circular background and selected frame. Parent screens may position the avatar, but must not add another circular fill, border, shadow, or frame. The editor preview uses a neutral layout stage with no competing ring, and the completion modal wrapper provides spacing only. Frames use one crisp colour stroke; they do not add an inner concentric detail or a separate black shadow ring.

Static and animated avatars share the same visible layer ownership. The static renderer contains background and frame only. The animated renderer contains character artwork only, so motion cannot expose a stationary duplicate face, body, hair, or accessory beneath it. Character silhouettes do not use offset outer shadows; internal outfit highlights and shading remain available where they do not create a second outline.

The current inline layer order is background, body, hair back, face, hair front, facial features, accessories, then frame. Long hair is the only current style with a separate back layer. Glasses, headbands, and headphones render above facial features and hair, while the frame remains the final crisp boundary.

`expo/lib/avatarGeometry.ts` records the bounded vertical offset and effective fringe edge for every persisted hairstyle. Buzz, Short, Side part, Curly, Long, and Bun all stop above the eye region; None applies no transform or unexplained hair shadow. New professional hair must provide explicit back/front layers where required, preserve the shared face/eye safe region, and include verified anchors for glasses, headbands, and headphones.

## Professional art delivery

Future layered art should share one coordinate system and anchor points. Recommended delivery:

- 1024 x 1024 master canvas for each character family.
- Transparent canvas with roughly 10-12% safe padding around the widest pose/accessory.
- Identical head, face, shoulder, and baseline anchors across expressions and outfits.
- Separate face/expression, body/outfit, accessory, background, frame, and effect layers.
- Separate hair-back and hair-front layers, with the front fringe ending above the documented eye-safe region.
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

The next focused step is to import one professionally delivered layered character, validate alignment at all five sizes, and map expression assets without changing editor or screen APIs. A later catalogue project can define persistence for additional stable layer IDs. Availability, unlock ownership, rewards, shops, currencies, and inventories remain separate from rendering and editing.

## Motion and reactions

The character layer alone moves; backgrounds and frames remain fixed.

- Idle uses neutral expression, sub-pixel vertical movement, and a maximum 0.6% scale change over a slow eased cycle.
- Matchmaking and unresolved opponent waits use focused expression and a slow 1.1-degree thinking tilt.
- Authoritative wins and successful solo completions use happy expression and one 660 ms lift/scale celebration.
- Authoritative losses use sad expression and one 700 ms downward settle/tilt.
- Draws, cancelled results, unresolved outcomes, failed saves, and unknown future outcomes are neutral and static.

`getAvatarReactionForOutcome`, `getOpponentAvatarReactionForOutcome`, and `getAvatarReactionForMatchState` are the pure mapping contract. The completion modal only reacts once its existing save/outcome state is safe. The Versus card uses completed duel IDs plus completion timestamps for player/opponent reaction keys. The game completion modal uses the existing completion key with a player suffix.

One-shot keys are claimed once per app session. A per-instance gate consumes the claim before motion starts, so rerenders, focus changes, remounts, and revisiting an old result do not replay it; a genuinely new result key can. Immediate React effect setup/cleanup is settled before native motion begins, while later cleanup only cancels the animation and never releases the key.

System Reduced Motion keeps happy, sad, focused, and neutral expressions but forces all motion static. A reaction first shown with Reduced Motion is still consumed, so disabling the setting cannot animate that old result later. Static contexts still do not mount animation hooks.

Current emotional placements are own Profile, Daily/Ranked Versus and matchmaking, and the game completion modal for Classic, Daily, Daily Duel, Ranked, and Friend Challenge flows. Home, public profiles, leaderboards, friends/search rows, notifications, compact cards, and editor previews remain static.

The inline renderer can make restrained brow and mouth changes for all four expressions. Professional art should later provide aligned eye, brow, and mouth layers for each expression, plus consistent character anchors, so stronger expression fidelity does not require changing screen APIs or animation policy.
