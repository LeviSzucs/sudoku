import { Tabs } from "expo-router";
import { Home, Play as PlayIcon, Swords, Trophy, User } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { C } from "@/constants/colors";

const TAB_BAR_STYLE = {
  backgroundColor: C.bgElevated,
  borderTopColor: C.border,
  borderTopWidth: 1,
  height: Platform.OS === "ios" ? 86 : 68,
  paddingTop: 8,
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.mutedSoft,
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: "Play",
          tabBarIcon: ({ color }) => <PlayIcon color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="versus"
        options={{
          title: "Versus",
          tabBarIcon: ({ color }) => <Swords color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="leaderboards"
        options={{
          title: "Leaderboards",
          tabBarIcon: ({ color }) => <Trophy color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen name="stats-puzzles" options={{ href: null }} />
      <Tabs.Screen name="stats-win-rate" options={{ href: null }} />
      <Tabs.Screen name="stats-best-times" options={{ href: null }} />
      <Tabs.Screen name="stats-streak" options={{ href: null }} />
      <Tabs.Screen name="stats-competitive-rank" options={{ href: null }} />
    </Tabs>
  );
}
