import React, { useEffect } from "react";
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
import type { AvatarProfileSource, CharacterAvatarConfig } from "@/lib/avatar";
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
}

interface RenderAvatarProps extends AvatarProps {
  resolvedSize: number;
  resolvedExpression: AvatarExpression;
  resolvedMotion: AvatarMotion;
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
  const capabilities = resolveAvatarCapabilities(character, presentation);
  const resolvedSize = resolveAvatarSize(variant ?? presentation.size, size);
  const accessible = presentation.accessibilityMode === "identity" && Boolean(accessibilityLabel);
  const renderProps: RenderAvatarProps = {
    ...avatarProps,
    appearance,
    source,
    context,
    active,
    reduceMotion,
    decorative,
    accessibilityLabel,
    resolvedSize,
    resolvedExpression: capabilities.expression,
    resolvedMotion: capabilities.motion,
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
      {capabilities.animated && capabilities.motion !== "static" ? (
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
  showBackground,
  showFrame,
  ...avatarConfig
}: RenderAvatarProps) {
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

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotate);
    translateY.value = 0;
    scale.value = 1;
    rotate.value = 0;

    if (shouldAnimate) {
      if (props.resolvedMotion === "idle") {
        translateY.value = withRepeat(
          withSequence(
            withTiming(-0.5, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.012, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      } else if (props.resolvedMotion === "thinking") {
        rotate.value = withRepeat(
          withSequence(
            withTiming(-1.5, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
            withTiming(1.5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
      } else if (props.resolvedMotion === "celebrate") {
        translateY.value = withSequence(
          withTiming(-3, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.inOut(Easing.quad) }),
        );
        scale.value = withSequence(
          withTiming(1.06, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0.99, { duration: 100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 180, easing: Easing.inOut(Easing.quad) }),
        );
      } else if (props.resolvedMotion === "defeated") {
        translateY.value = withSequence(
          withTiming(3, { duration: 240, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.inOut(Easing.quad) }),
        );
        rotate.value = withSequence(
          withTiming(1.8, { duration: 240, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 360, easing: Easing.inOut(Easing.quad) }),
        );
      }
    }

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(scale);
      cancelAnimation(rotate);
      translateY.value = 0;
      scale.value = 1;
      rotate.value = 0;
    };
  }, [props.resolvedMotion, rotate, scale, shouldAnimate, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const rendererProps = {
    ...props,
    expression: props.resolvedExpression,
    size: props.resolvedSize,
  };

  return (
    <View style={[styles.layerWrap, { width: props.resolvedSize, height: props.resolvedSize }]}>
      <AvatarRenderer
        {...rendererProps}
        initials={props.initials}
        legacyColor={props.color}
        legacySymbol={props.symbol}
        layer="static"
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.characterLayer, animatedStyle]}>
        <AvatarRenderer
          {...rendererProps}
          initials={props.initials}
          legacyColor={props.color}
          legacySymbol={props.symbol}
          layer="character"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layerWrap: {
    position: "relative",
  },
  characterLayer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
