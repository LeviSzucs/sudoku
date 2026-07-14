import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  createAnimatedComponent,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from "react-native-svg";

import { C } from "@/constants/colors";
import { normalizeAvatarConfig, type CharacterAvatarConfig } from "@/lib/avatar";
import type { AvatarExpression, AvatarMotion, AvatarMotionDebugConfig } from "@/components/Avatar";

interface AvatarRendererProps extends CharacterAvatarConfig {
  initials?: string | null;
  legacyColor?: string | null;
  legacySymbol?: string | null;
  size?: number;
  expression?: AvatarExpression;
  motion?: AvatarMotion;
  motionKey?: string | null;
  active?: boolean;
  reduceMotion?: boolean;
  debugMotionConfig?: AvatarMotionDebugConfig;
}

interface AvatarFaceSpec {
  leftBrow: { x1: number; y1: number; x2: number; y2: number };
  rightBrow: { x1: number; y1: number; x2: number; y2: number };
  mouthPath: string;
  eyeOpenScale: number;
}

const AnimatedEllipse = createAnimatedComponent(Ellipse);

const INK = "#15171C";
const CREAM = "#FBF8F2";
const MIN_ANIMATED_SIZE = 44;
const DEFAULT_BLINK_RANGE: readonly [number, number] = [4500, 7000];
const DEFAULT_THINKING_RANGE: readonly [number, number] = [2600, 4200];

function frameColor(frame: string | null): string | null {
  if (frame === "bronze") return "#B86246";
  if (frame === "silver") return "#A8A294";
  if (frame === "gold" || frame === "ranked_crown" || frame === "premium_crown") return "#C8A45D";
  return null;
}

function resolveRange(
  value: number | readonly [number, number] | undefined,
  fallback: readonly [number, number],
): readonly [number, number] {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return [value, value] as const;
  }
  if (
    Array.isArray(value)
    && value.length === 2
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
  ) {
    const min = Math.max(0, Math.min(value[0], value[1]));
    const max = Math.max(min, Math.max(value[0], value[1]));
    return [min, max] as const;
  }
  return fallback;
}

function randomBetween([min, max]: readonly [number, number]): number {
  if (min === max) return min;
  return Math.round(min + Math.random() * (max - min));
}

function getFaceSpec(expression: AvatarExpression): AvatarFaceSpec {
  if (expression === "happy") {
    return {
      leftBrow: { x1: 36, y1: 39, x2: 46, y2: 40.5 },
      rightBrow: { x1: 54, y1: 40.5, x2: 64, y2: 39 },
      mouthPath: "M41 56 C45 63 55 63 59 56",
      eyeOpenScale: 0.82,
    };
  }
  if (expression === "sad") {
    return {
      leftBrow: { x1: 36, y1: 41.5, x2: 46, y2: 39.5 },
      rightBrow: { x1: 54, y1: 39.5, x2: 64, y2: 41.5 },
      mouthPath: "M42 60 C46 55 54 55 58 60",
      eyeOpenScale: 0.9,
    };
  }
  if (expression === "focused") {
    return {
      leftBrow: { x1: 36, y1: 40.5, x2: 46, y2: 38.3 },
      rightBrow: { x1: 54, y1: 38.3, x2: 64, y2: 40.5 },
      mouthPath: "M44 57.6 C47.5 58.7 52.5 58.7 56 57.6",
      eyeOpenScale: 0.86,
    };
  }
  return {
    leftBrow: { x1: 36, y1: 40, x2: 46, y2: 39 },
    rightBrow: { x1: 54, y1: 39, x2: 64, y2: 40 },
    mouthPath: "M43 57 C47 61 53 61 57 57",
    eyeOpenScale: 1,
  };
}

export default function AvatarRenderer({
  initials,
  legacyColor,
  legacySymbol,
  size = 40,
  expression = "neutral",
  motion = "static",
  motionKey = null,
  active = true,
  reduceMotion,
  debugMotionConfig,
  ...config
}: AvatarRendererProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = reduceMotion ?? prefersReducedMotion;
  const avatar = normalizeAvatarConfig(config, { initials, color: legacyColor, symbol: legacySymbol });
  const bg = avatar.avatar_bg_color || "#1E1B4B";
  const skin = avatar.avatar_skin_tone || "#D19A6E";
  const hair = avatar.avatar_hair_color || "#6E432D";
  const top = avatar.avatar_top_color || "#1E1B4B";
  const frame = frameColor(avatar.avatar_frame);
  const showInitialFallback = Boolean(legacySymbol) && avatar.avatar_style_version !== "character_v1";
  const face = useMemo(() => getFaceSpec(expression), [expression]);
  const canAnimate = active && size >= MIN_ANIMATED_SIZE;
  const shouldAnimateLoops = canAnimate && !shouldReduceMotion && (motion === "idle" || motion === "thinking");
  const shouldBlink = canAnimate && !shouldReduceMotion && motion !== "static" && !debugMotionConfig?.disableBlink;
  const blinkRange = useMemo(
    () => resolveRange(debugMotionConfig?.blinkIntervalMs, DEFAULT_BLINK_RANGE),
    [debugMotionConfig?.blinkIntervalMs],
  );
  const thinkingRange = useMemo(
    () => resolveRange(debugMotionConfig?.thinkingPauseMs, DEFAULT_THINKING_RANGE),
    [debugMotionConfig?.thinkingPauseMs],
  );

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const eyeOpen = useSharedValue(face.eyeOpenScale);

  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOneShotKeyRef = useRef<string | null>(null);
  const lastMotionRef = useRef<AvatarMotion>("static");

  useEffect(() => {
    eyeOpen.value = face.eyeOpenScale;
  }, [eyeOpen, face.eyeOpenScale]);

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotation);

    translateY.value = 0;
    scale.value = 1;
    rotation.value = 0;

    if (!canAnimate || shouldReduceMotion || motion === "static" || motion === "celebrate" || motion === "defeated") {
      return;
    }

    if (motion === "idle") {
      translateY.value = withRepeat(
        withSequence(
          withTiming(-1.25, {
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(1.25, {
            duration: 1600,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
        ),
        -1,
        true,
      );
      return;
    }
  }, [canAnimate, motion, rotation, scale, shouldReduceMotion, translateY]);

  useEffect(() => {
    if (thinkingTimeoutRef.current) {
      clearTimeout(thinkingTimeoutRef.current);
      thinkingTimeoutRef.current = null;
    }

    if (motion !== "thinking" || !shouldAnimateLoops) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    let cancelled = false;
    const queueTilt = () => {
      if (cancelled) return;
      thinkingTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        rotation.value = withSequence(
          withTiming(2, {
            duration: 720,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: 780,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: ReduceMotion.System,
          }),
        );
        queueTilt();
      }, randomBetween(thinkingRange));
    };

    queueTilt();
    return () => {
      cancelled = true;
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
        thinkingTimeoutRef.current = null;
      }
      cancelAnimation(rotation);
      rotation.value = 0;
    };
  }, [motion, rotation, shouldAnimateLoops, thinkingRange]);

  useEffect(() => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }

    cancelAnimation(eyeOpen);
    eyeOpen.value = face.eyeOpenScale;

    if (!shouldBlink) {
      return;
    }

    let cancelled = false;
    const queueBlink = () => {
      if (cancelled) return;
      blinkTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        eyeOpen.value = withSequence(
          withTiming(0.08, {
            duration: 100,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(face.eyeOpenScale, {
            duration: 110,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        );
        queueBlink();
      }, randomBetween(blinkRange));
    };

    queueBlink();
    return () => {
      cancelled = true;
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
        blinkTimeoutRef.current = null;
      }
      cancelAnimation(eyeOpen);
      eyeOpen.value = face.eyeOpenScale;
    };
  }, [blinkRange, eyeOpen, face.eyeOpenScale, shouldBlink]);

  useEffect(() => {
    if (!canAnimate || motion === "static" || motion === "idle" || motion === "thinking") {
      lastMotionRef.current = motion;
      return;
    }

    const oneShotKey = motionKey ?? `${motion}:${expression}`;
    const shouldReplay = lastMotionRef.current !== motion || lastOneShotKeyRef.current !== oneShotKey;
    lastMotionRef.current = motion;
    if (!shouldReplay) return;
    lastOneShotKeyRef.current = oneShotKey;

    cancelAnimation(translateY);
    cancelAnimation(scale);
    cancelAnimation(rotation);
    translateY.value = 0;
    scale.value = 1;
    rotation.value = 0;

    if (motion === "celebrate") {
      if (shouldReduceMotion) {
        scale.value = withSequence(
          withTiming(1.03, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(1, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        );
        translateY.value = withSequence(
          withTiming(-1, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(0, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        );
        return;
      }

      scale.value = withSequence(
        withTiming(1.07, {
          duration: 170,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0.98, {
          duration: 120,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withSpring(1, {
          damping: 10,
          stiffness: 200,
          mass: 0.72,
          reduceMotion: ReduceMotion.System,
        }),
      );
      translateY.value = withSequence(
        withTiming(-3.25, {
          duration: 170,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0.8, {
          duration: 120,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.System,
        }),
        withSpring(0, {
          damping: 11,
          stiffness: 210,
          mass: 0.72,
          reduceMotion: ReduceMotion.System,
        }),
      );
      return;
    }

    if (shouldReduceMotion) {
      scale.value = withSequence(
        withTiming(0.985, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(1, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      );
      translateY.value = withSequence(
        withTiming(1.5, {
          duration: 140,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: 180,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        }),
      );
      return;
    }

    scale.value = withSequence(
      withTiming(0.97, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    translateY.value = withSequence(
      withTiming(3, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
    rotation.value = withSequence(
      withTiming(1.8, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [canAnimate, expression, motion, motionKey, rotation, scale, shouldReduceMotion, translateY]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const leftEyeAnimatedProps = useAnimatedProps(() => ({
    ry: Math.max(0.12, 3 * face.eyeOpenScale * eyeOpen.value),
  }));
  const rightEyeAnimatedProps = useAnimatedProps(() => ({
    ry: Math.max(0.12, 3 * face.eyeOpenScale * eyeOpen.value),
  }));

  return (
    <Animated.View style={wrapperStyle}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="50" fill={bg} />
          <Circle cx="68" cy="18" r="20" fill={CREAM} opacity="0.08" />
          <Path d="M14 100 C19 75 33 64 50 64 C67 64 81 75 86 100 Z" fill="#000000" opacity="0.14" />
          <Path d="M17 100 C22 76 35 66 50 66 C65 66 78 76 83 100 Z" fill={top} />
          <Path d="M28 86 C37 79 63 79 72 86 L78 100 L22 100 Z" fill="#000000" opacity="0.1" />
          {avatar.avatar_top_style === "hoodie" ? (
            <>
              <Path d="M28 75 C34 62 45 59 50 59 C55 59 66 62 72 75 C63 71 57 70 50 70 C43 70 37 71 28 75 Z" fill={CREAM} opacity="0.28" />
              <Line x1="43" y1="72" x2="39" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
              <Line x1="57" y1="72" x2="61" y2="88" stroke={CREAM} strokeWidth="2" opacity="0.5" />
            </>
          ) : null}
          {avatar.avatar_top_style === "collared" ? (
            <>
              <Polygon points="35,68 49,81 39,84" fill={CREAM} opacity="0.9" />
              <Polygon points="65,68 51,81 61,84" fill={CREAM} opacity="0.9" />
            </>
          ) : null}
          {avatar.avatar_top_style === "jersey" ? (
            <>
              <Line x1="50" y1="69" x2="50" y2="98" stroke={CREAM} strokeWidth="3" opacity="0.45" />
              <Line x1="33" y1="75" x2="67" y2="75" stroke={CREAM} strokeWidth="3" opacity="0.24" />
            </>
          ) : null}

          <Ellipse cx="50" cy="45" rx="23" ry="25" fill="#000000" opacity="0.16" />
          <Ellipse cx="50" cy="42" rx="23" ry="24" fill={skin} />
          <Ellipse cx="28" cy="43" rx="5" ry="7" fill={skin} />
          <Ellipse cx="72" cy="43" rx="5" ry="7" fill={skin} />
          <Ellipse cx="41" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" />
          <Ellipse cx="59" cy="51" rx="4" ry="2.4" fill="#FFFFFF" opacity="0.18" />

          {avatar.avatar_hair_style === "buzz" ? (
            <>
              <Path d="M26 39 C25 24 36 16 50 16 C64 16 75 24 74 39 C68 34 60 32 50 32 C40 32 32 34 26 39 Z" fill={hair} />
              <Path d="M29 36 C37 31 63 31 71 36" stroke={INK} strokeWidth="1.5" opacity="0.16" strokeLinecap="round" fill="none" />
              <Path d="M31 31 C40 25 60 25 69 31" stroke={CREAM} strokeWidth="2" opacity="0.08" strokeLinecap="round" fill="none" />
            </>
          ) : null}
          {avatar.avatar_hair_style === "short" ? (
            <>
              <Path d="M24 39 C25 24 36 16 50 16 C65 16 76 25 76 41 C67 35 58 33 48 34 C40 34 32 37 24 43 Z" fill={hair} />
              <Path d="M27 40 C35 34 45 32 55 33 C63 33 70 36 75 41 L73 47 C64 39 38 38 28 47 Z" fill={hair} />
            </>
          ) : null}
          {avatar.avatar_hair_style === "side_part" ? (
            <>
              <Path d="M24 40 C28 22 42 16 55 18 C66 20 74 28 77 42 C64 34 51 34 39 41 C34 44 30 46 26 48 Z" fill={hair} />
              <Path d="M35 24 C45 30 60 31 76 39 C65 26 49 20 35 24 Z" fill={hair} />
              <Path d="M44 22 C42 30 35 38 27 45" stroke={CREAM} strokeWidth="2.2" opacity="0.18" strokeLinecap="round" />
            </>
          ) : null}
          {avatar.avatar_hair_style === "curly" ? (
            <>
              <Path d="M23 42 C25 27 37 18 50 18 C64 18 75 27 77 42 C66 36 34 36 23 42 Z" fill={hair} />
              {[28, 36, 44, 52, 60, 68, 74].map((cx, index) => (
                <Circle key={cx} cx={cx} cy={31 + (index % 2) * 3} r="7.4" fill={hair} />
              ))}
              <Path d="M27 42 C37 36 63 36 73 42 L72 48 C63 40 37 40 28 48 Z" fill={hair} />
            </>
          ) : null}
          {avatar.avatar_hair_style === "long" ? (
            <>
              <Path d="M22 40 C24 20 36 15 50 15 C64 15 76 20 78 40 L75 72 C68 66 65 54 66 43 C59 36 41 36 34 43 C35 54 32 66 25 72 Z" fill={hair} />
              <Path d="M28 42 C38 33 62 33 72 42 C63 39 37 39 28 42 Z" fill={hair} />
            </>
          ) : null}
          {avatar.avatar_hair_style === "bun" ? (
            <>
              <Circle cx="50" cy="15" r="9.5" fill={hair} />
              <Path d="M25 39 C27 23 38 18 50 18 C62 18 73 23 75 39 C64 33 36 33 25 39 Z" fill={hair} />
              <Path d="M32 34 C40 28 60 28 68 34" stroke={CREAM} strokeWidth="2" opacity="0.1" strokeLinecap="round" fill="none" />
            </>
          ) : null}

          <Line
            x1={face.leftBrow.x1}
            y1={face.leftBrow.y1}
            x2={face.leftBrow.x2}
            y2={face.leftBrow.y2}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <Line
            x1={face.rightBrow.x1}
            y1={face.rightBrow.y1}
            x2={face.rightBrow.x2}
            y2={face.rightBrow.y2}
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
          <AnimatedEllipse animatedProps={leftEyeAnimatedProps} cx="42" cy="45" rx="2.6" fill={INK} />
          <AnimatedEllipse animatedProps={rightEyeAnimatedProps} cx="58" cy="45" rx="2.6" fill={INK} />
          <Circle cx="43" cy="44" r="0.8" fill={CREAM} opacity="0.9" />
          <Circle cx="59" cy="44" r="0.8" fill={CREAM} opacity="0.9" />
          <Path d={face.mouthPath} stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.58" />

          {avatar.avatar_accessory === "glasses" ? (
            <>
              <Circle cx="42" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
              <Circle cx="58" cy="45" r="7.5" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.88" />
              <Line x1="49" y1="45" x2="51" y2="45" stroke={INK} strokeWidth="2.5" />
            </>
          ) : null}
          {avatar.avatar_accessory === "headband" ? (
            <Path d="M27 36 C39 29 61 29 73 36" stroke={CREAM} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.92" />
          ) : null}
          {avatar.avatar_accessory === "headphones" ? (
            <>
              <Path d="M27 43 C27 25 73 25 73 43" stroke={INK} strokeWidth="4" fill="none" />
              <Rect x="21" y="38" width="9" height="16" rx="4.5" fill={INK} />
              <Rect x="70" y="38" width="9" height="16" rx="4.5" fill={INK} />
            </>
          ) : null}
          {frame ? (
            <>
              <Circle cx="50" cy="50" r="47" stroke="#000000" strokeWidth="7" opacity="0.16" fill="none" />
              <Circle
                cx="50"
                cy="50"
                r="46"
                stroke={frame}
                strokeWidth={avatar.avatar_frame === "ranked_crown" || avatar.avatar_frame === "premium_crown" ? "6" : "5"}
                fill="none"
              />
              <Circle cx="50" cy="50" r="39" stroke={frame} strokeWidth="1.4" opacity="0.5" fill="none" />
            </>
          ) : null}
          {avatar.avatar_frame === "ranked_crown" || avatar.avatar_frame === "premium_crown"
            ? <Polygon points="37,13 45,18 50,8 55,18 63,13 60,26 40,26" fill="#C8A45D" stroke={INK} strokeWidth="1.2" />
            : null}
        </Svg>
        {showInitialFallback ? (
          <Text style={[styles.fallbackText, { fontSize: size * 0.34 }]}>{legacySymbol || avatar.avatar_initials}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackText: {
    color: C.bgElevated,
    fontWeight: "900",
    letterSpacing: 0,
    position: "absolute",
  },
});
