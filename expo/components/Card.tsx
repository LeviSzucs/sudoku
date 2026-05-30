import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { C } from "@/constants/colors";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
  testID?: string;
}

export default function Card({ children, onPress, style, padded = true, testID }: CardProps) {
  const content = (
    <View style={[styles.card, padded && styles.padded, style]} testID={testID}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  padded: {
    padding: 18,
  },
});
