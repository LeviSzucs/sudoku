import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PlayerProfileProvider } from "@/hooks/usePlayerProfile";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const auth = useAuth();
  const showApp = auth.mode === "signed_in" || auth.mode === "guest";
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Protected guard={!showApp}>
        <Stack.Screen name="auth" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={showApp}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="achievements" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="results" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: "card" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlayerProfileProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar style="dark" />
              <RootLayoutNav />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </PlayerProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
