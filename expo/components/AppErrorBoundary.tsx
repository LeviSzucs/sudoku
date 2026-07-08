import { router, usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_NAME } from "@/constants/branding";
import { C } from "@/constants/colors";
import { reportRuntimeError, setRuntimeErrorContext } from "@/lib/runtimeErrors";

interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryInnerProps extends BoundaryProps {
  route: string | null;
  onTryAgain: () => void;
}

interface BoundaryInnerState {
  hasError: boolean;
}

class BoundaryInner extends React.Component<BoundaryInnerProps, BoundaryInnerState> {
  state: BoundaryInnerState = { hasError: false };

  static getDerivedStateFromError(): BoundaryInnerState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void reportRuntimeError(error, {
      scope: "react_boundary",
      fatal: false,
      route: this.props.route,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.eyebrow}>ERROR</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            {APP_NAME} hit a runtime error and returned to a safe state. If this happens again, please open Settings and contact support.
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => {
              this.setState({ hasError: false }, () => {
                router.replace("/(tabs)");
                this.props.onTryAgain();
              });
            }}
          >
            <Text style={styles.primaryText}>Go to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

export default function AppErrorBoundary({ children }: BoundaryProps) {
  const pathname = usePathname();
  const [resetKey, setResetKey] = useState(0);
  const route = useMemo(() => pathname ?? null, [pathname]);

  useEffect(() => {
    setRuntimeErrorContext({ route });
  }, [route]);

  return (
    <BoundaryInner
      key={resetKey}
      route={route}
      onTryAgain={() => setResetKey((current) => current + 1)}
    >
      {children}
    </BoundaryInner>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  eyebrow: { color: C.muted, fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: C.ink, fontSize: 30, fontWeight: "900", marginTop: 8 },
  body: { color: C.muted, fontSize: 15, fontWeight: "700", lineHeight: 22, marginTop: 12 },
  primary: { marginTop: 20, backgroundColor: C.ink, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 },
});
