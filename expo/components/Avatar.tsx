import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import AvatarRenderer from "@/components/AvatarRenderer";
import { resolveAvatarRenderModel, type AvatarProfileSource, type CharacterAvatarConfig } from "@/lib/avatar";
import { createAvatarReactionPlaybackGate, type AvatarReactionPlaybackGate } from "@/lib/avatarReactionPlayback";
import {
  AVATAR_SIZE_PIXELS,
  getAvatarPresentationForContext,
  resolveAvatarCapabilities,
  resolveAvatarCharacter,
  type AvatarAppearance,
  type AvatarContext,
  type AvatarExpression,
  type AvatarMotion,
  type AvatarSize,
} from "@/lib/avatarFoundation";
import { avatarCharacterClipInset } from "@/lib/avatarGeometry";

export type AvatarSizeVariant = AvatarSize;
export type { AvatarContext, AvatarExpression, AvatarMotion };
export const AVATAR_SIZES = AVATAR_SIZE_PIXELS;

interface AvatarProps extends CharacterAvatarConfig {
  initials?: string | null;
  color?: string | null;
  variant?: AvatarSizeVariant;
  size?: number;
  symbol?: string | null;
  context?: AvatarContext;
  appearance?: Partial<AvatarAppearance> | null;
  expression?: AvatarExpression;
  motion?: AvatarMotion;
  animated?: boolean;
  active?: boolean;
  reduceMotion?: boolean;
  source?: AvatarProfileSource;
  decorative?: boolean;
  accessibilityLabel?: string;
  reactionKey?: string | null;
}

interface RenderAvatarProps extends AvatarProps {
  resolvedSize: number;
  resolvedExpression: AvatarExpression;
  resolvedMotion: AvatarMotion;
  requestedMotion?: AvatarMotion;
  resolvedFrame: string | null;
  showBackground: boolean;
  showFrame: boolean;
}

export function resolveAvatarSize(variant: AvatarSizeVariant = "md", size?: number): number {
  return typeof size === "number" ? size : AVATAR_SIZES[variant];
}

export default function Avatar({
  context = "home",
  variant,
  size,
  expression,
  motion,
  animated,
  active = true,
  reduceMotion = false,
  decorative = false,
  accessibilityLabel,
  appearance,
  reactionKey,
  source = "profile",
  ...avatarProps
}: AvatarProps) {
  const presentation = getAvatarPresentationForContext(context, {
    expression,
    motion,
    size: variant,
    animated,
    active,
    reducedMotion: reduceMotion,
    decorative,
  });
  const character = resolveAvatarCharacter(appearance?.characterId ?? avatarProps.avatar_style_version);
  const resolvedFrame = resolveAvatarRenderModel(
    avatarProps,
    { initials: avatarProps.initials, color: avatarProps.color, symbol: avatarProps.symbol },
    appearance,
    source,
  ).config.avatar_frame;
  const capabilities = resolveAvatarCapabilities(character, presentation);
  const resolvedSize = resolveAvatarSize(variant ?? presentation.size, size);
  const accessible = presentation.accessibilityMode === "identity" && Boolean(accessibilityLabel);
  const requestedMotion = context === "result" && (motion === "celebrate" || motion === "defeated")
    ? motion
    : undefined;
  const renderProps: RenderAvatarProps = {
    ...avatarProps,
    appearance,
    source,
    context,
    active,
    reduceMotion,
    decorative,
    accessibilityLabel,
    reactionKey,
    resolvedSize,
    resolvedExpression: capabilities.expression,
    resolvedMotion: capabilities.motion,
    requestedMotion,
    resolvedFrame,
    showBackground: presentation.showBackground,
    showFrame: presentation.showFrame,
  };

  return (
    <View
      accessible={accessible}
      accessibilityRole={accessible ? "image" : undefined}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      importantForAccessibility={accessible ? "yes" : "no-hide-descendants"}
      style={{ width: resolvedSize, height: resolvedSize }}
    >
      {(capabilities.animated && capabilities.motion !== "static")
        || Boolean(requestedMotion && reactionKey?.trim()) ? (
        <AnimatedAvatar {...renderProps} />
      ) : (
        <StaticAvatar {...renderProps} />
      )}
    </View>
  );
}

function StaticAvatar({
  initials,
  color,
  symbol,
  appearance,
  source,
  resolvedSize,
  resolvedExpression,
  resolvedFrame: _resolvedFrame,
  showBackground,
  showFrame,
  ...avatarConfig
}: RenderAvatarProps) {
  void _resolvedFrame;
  return (
    <AvatarRenderer
      {...avatarConfig}
      initials={initials}
      legacyColor={color}
      legacySymbol={symbol}
      appearance={appearance}
      expression={resolvedExpression}
      showBackground={showBackground}
      showFrame={showFrame}
      source={source}
      size={resolvedSize}
    />
  );
}

function AnimatedAvatar(props: RenderAvatarProps) {
  const systemReducedMotion = useReducedMotion();
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const shouldAnimate = props.active !== false && !props.reduceMotion && !systemReducedMotion;
  const isOneShotReaction = props.requestedMotion === "celebrate" || props.requestedMotion === "defeated";
  const reactionGateRef = useRef<AvatarReactionPlaybackGate | null>(null);
  const effectGenerationRef = useRef(0);
  if (!reactionGateRef.current) {
    reactionGateRef.current = createAvatarReactionPlaybackGate();
  }

  useEffect(() => {
    const effectGeneration = ++effectGenerationRef.current;
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotate);
    translateY.value = 0;
    scale.value = 1;
    rotate.value = 0;

    const reactionKey = props.reactionKey?.trim() || null;
    const reactionGate = reactionGateRef.current!;

    if (isOneShotReaction && props.requestedMotion) {
      reactionGate.prepare(reactionKey);
      const canAnimateReaction = shouldAnimate && props.resolvedMotion === props.requestedMotion;

      if (!canAnimateReaction) {
        reactionGate.consume(reactionKey, false);
      } else {
        queueMicrotask(() => {
          if (effectGenerationRef.current !== effectGeneration) return;
          if (!reactionGate.consume(reactionKey, true)) return;

          if (props.requestedMotion === "celebrate") {
            translateY.value = withSequence(
              withTiming(-2.5, { duration: 240, easing: Easing.out(Easing.cubic) }),
              withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
            );
            scale.value = withSequence(
              withTiming(1.045, { duration: 240, easing: Easing.out(Easing.cubic) }),
              withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
            );
          } else {
            translateY.value = withSequence(
              withTiming(2.5, { duration: 280, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
            );
            rotate.value = withSequence(
              withTiming(1.4, { duration: 280, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
            );
          }
        });
      }
    }

    if (shouldAnimate && !isOneShotReaction) {
      if (props.resolvedMotion === "idle") {
        translateY.value = withRepeat(
          withSequence(
            withTiming(-0.55, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.65, { duration: 1650, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.008, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1650, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
      } else if (props.resolvedMotion === "thinking") {
        rotate.value = withRepeat(
          withSequence(
            withTiming(-1.1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.1, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        );
      }
    }

    return () => {
      effectGenerationRef.current += 1;
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(rotate);
      translateY.value = 0;
      scale.value = 1;
      rotate.value = 0;
    };
  }, [isOneShotReaction, props.reactionKey, props.requestedMotion, props.resolvedMotion, rotate, scale, shouldAnimate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const { resolvedFrame, ...rendererAvatarProps } = props;
  const rendererProps = {
    ...rendererAvatarProps,
    expression: props.resolvedExpression,
    size: props.resolvedSize,
  };
  const characterClipInset = avatarCharacterClipInset(props.resolvedSize, resolvedFrame);
  const characterClipSize = props.resolvedSize - characterClipInset * 2;

  return (
    <View style={[styles.layerWrap, { width: props.resolvedSize, height: props.resolvedSize, borderRadius: props.resolvedSize / 2 }]}>
      <AvatarRenderer
        {...rendererProps}
        initials={props.initials}
        legacyColor={props.color}
        legacySymbol={props.symbol}
        layer="static"
      />
      <View
        pointerEvents="none"
        style={[
          styles.characterClip,
          {
            top: characterClipInset,
            left: characterClipInset,
            width: characterClipSize,
            height: characterClipSize,
            borderRadius: characterClipSize / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.characterLayer,
            {
              top: -characterClipInset,
              left: -characterClipInset,
              width: props.resolvedSize,
              height: props.resolvedSize,
            },
            animatedStyle,
          ]}
        >
          <AvatarRenderer
            {...rendererProps}
            initials={props.initials}
            legacyColor={props.color}
            legacySymbol={props.symbol}
            layer="character"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layerWrap: {
    position: "relative",
    overflow: "hidden",
  },
  characterClip: {
    position: "absolute",
    overflow: "hidden",
  },
  characterLayer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});

