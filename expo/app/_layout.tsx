import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PlayerProfileProvider, usePlayerProfile } from "@/hooks/usePlayerProfile";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const auth = useAuth();
  const { isLoaded, profileSetupRequired } = usePlayerProfile();
  const isCheckingProfile = auth.mode === "signed_in" && !isLoaded;
  const showLoading = auth.mode === "loading" || isCheckingProfile;
  const showAuth = auth.mode === "signed_out";
  const showSetup = auth.mode === "signed_in" && isLoaded && profileSetupRequired;
  const showApp = auth.mode === "signed_in" && isLoaded && !profileSetupRequired;
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Protected guard={showLoading}>
        <Stack.Screen name="loading" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={showAuth}>
        <Stack.Screen name="auth" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={showSetup}>
        <Stack.Screen name="username-setup" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={showApp}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="achievements" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="friends" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="friend-h2h" options={{ headerShown: false, presentation: "card" }} />
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
