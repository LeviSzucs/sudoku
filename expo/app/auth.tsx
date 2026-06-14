import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Shield, Trophy } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

type AuthStep = "splash" | "signup" | "login" | "reset_request" | "reset_sent" | "reset_update";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function friendlyAuthError(message?: string): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "Email or password is incorrect.";
  if (text.includes("already registered") || text.includes("already exists")) return "An account with this email already exists. Try logging in instead.";
  if (text.includes("password")) return message ?? "Please check your password and try again.";
  if (text.includes("email")) return message ?? "Please check your email and try again.";
  return message ?? "Something went wrong. Please try again.";
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export default function AuthScreen() {
  const params = useLocalSearchParams<{ step?: AuthStep }>();
  const initialStep = (params.step as AuthStep | undefined) ?? "splash";
  const [step, setStep] = useState<AuthStep>(initialStep);
  const auth = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const clearMessages = () => {
    setError(null);
    setNotice(null);
  };

  const goTo = (next: AuthStep) => {
    clearMessages();
    setStep(next);
  };

  const validateEmail = (): boolean => {
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  const validatePassword = (): boolean => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return false;
    }
    return true;
  };

  const createAccount = async () => {
    clearMessages();
    if (!validateEmail() || !validatePassword()) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await auth.signUp(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(friendlyAuthError(result.error));
      return;
    }
    router.replace("/username-setup");
  };

  const logIn = async () => {
    clearMessages();
    if (!validateEmail() || !validatePassword()) return;
    setLoading(true);
    const result = await auth.signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(friendlyAuthError(result.error));
      return;
    }
    router.replace("/(tabs)");
  };

  const sendResetEmail = async () => {
    clearMessages();
    if (!validateEmail()) return;
    setLoading(true);
    const result = await auth.resetPassword(email);
    setLoading(false);
    if (!result.ok) {
      setError(friendlyAuthError(result.error));
      return;
    }
    setStep("reset_sent");
  };

  const updatePassword = async () => {
    clearMessages();
    if (!validatePassword()) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await auth.updatePassword(password);
    setLoading(false);
    if (!result.ok) {
      setError(friendlyAuthError(result.error));
      return;
    }
    setNotice("Your password has been updated. You can continue to SudoDuel.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step !== "splash" ? (
            <Pressable onPress={() => goTo(step === "reset_update" ? "login" : "splash")} style={styles.back}>
              <ChevronLeft color={C.ink} size={22} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null}

          <View style={styles.logoWrap}>
            <BrandMark size={78} showWordmark tagline="Sudoku, made competitive." />
          </View>

          {step === "splash" ? (
            <View style={styles.panel}>
              <Feature icon={<Trophy size={18} color={C.gold} />} title="Compete fairly" text="Same boards, score-first leaderboards, skill-based RP." />
              <Feature icon={<Shield size={18} color={C.accent} />} title="Cloud profile" text="Save XP, badges, settings and results to your account." />
              <PrimaryButton label="Create account" onPress={() => goTo("signup")} />
              <SecondaryButton label="Log in" onPress={() => goTo("login")} />
            </View>
          ) : null}

          {step === "signup" ? (
            <AuthForm
              title="Create account"
              email={email}
              password={password}
              confirm={confirm}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirm={setConfirm}
              showConfirm
              error={error}
              notice={notice}
              loading={loading}
              button="Create account"
              onSubmit={createAccount}
              footer="Already have an account? Log in"
              onFooter={() => goTo("login")}
            />
          ) : null}

          {step === "login" ? (
            <AuthForm
              title="Log in"
              email={email}
              password={password}
              confirm={confirm}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirm={setConfirm}
              error={error}
              notice={notice}
              loading={loading}
              button="Log in"
              onSubmit={logIn}
              footer="New here? Create account"
              onFooter={() => goTo("signup")}
              secondaryFooter="Forgot password?"
              onSecondaryFooter={() => goTo("reset_request")}
            />
          ) : null}

          {step === "reset_request" ? (
            <ResetRequestForm
              email={email}
              setEmail={setEmail}
              error={error}
              loading={loading}
              onSubmit={sendResetEmail}
              onBack={() => goTo("login")}
            />
          ) : null}

          {step === "reset_sent" ? (
            <View style={styles.panel}>
              <Text style={styles.formTitle}>Check your email</Text>
              <Text style={styles.helperLarge}>If an account exists for {email.trim()}, we have sent a password reset link. Open the link on this device to set a new password.</Text>
              <PrimaryButton label="Back to log in" onPress={() => goTo("login")} />
            </View>
          ) : null}

          {step === "reset_update" ? (
            <AuthForm
              title="Set new password"
              email={email}
              password={password}
              confirm={confirm}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirm={setConfirm}
              showConfirm
              hideEmail
              error={error}
              notice={notice}
              loading={loading}
              button={notice ? "Continue" : "Update password"}
              onSubmit={notice ? () => router.replace("/(tabs)") : updatePassword}
              footer="Back to log in"
              onFooter={() => goTo("login")}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <View style={styles.feature}><View style={styles.featureIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text></View></View>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.secondary}><Text style={styles.secondaryText}>{label}</Text></Pressable>;
}

function ResetRequestForm(props: {
  email: string;
  setEmail: (value: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.formTitle}>Reset password</Text>
      <Text style={styles.helperLarge}>Enter your account email and we will send a secure reset link.</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={props.email}
        onChangeText={props.setEmail}
        placeholder="Email"
        placeholderTextColor={C.mutedSoft}
        style={styles.input}
      />
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      <Pressable disabled={props.loading} onPress={props.onSubmit} style={[styles.primary, props.loading && { opacity: 0.7 }]}>
        {props.loading ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>Send reset email</Text>}
      </Pressable>
      <Pressable onPress={props.onBack} style={styles.footerLink}><Text style={styles.link}>Back to log in</Text></Pressable>
    </View>
  );
}

function AuthForm(props: {
  title: string;
  email: string;
  password: string;
  confirm: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirm: (value: string) => void;
  showConfirm?: boolean;
  hideEmail?: boolean;
  error: string | null;
  notice: string | null;
  loading: boolean;
  button: string;
  onSubmit: () => void;
  footer: string;
  onFooter: () => void;
  secondaryFooter?: string;
  onSecondaryFooter?: () => void;
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.formTitle}>{props.title}</Text>
      {!props.hideEmail ? (
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={props.email}
          onChangeText={props.setEmail}
          placeholder="Email"
          placeholderTextColor={C.mutedSoft}
          style={styles.input}
        />
      ) : null}
      <TextInput
        secureTextEntry
        autoComplete="password"
        value={props.password}
        onChangeText={props.setPassword}
        placeholder="Password"
        placeholderTextColor={C.mutedSoft}
        style={styles.input}
      />
      {props.showConfirm ? (
        <TextInput
          secureTextEntry
          autoComplete="password"
          value={props.confirm}
          onChangeText={props.setConfirm}
          placeholder="Confirm password"
          placeholderTextColor={C.mutedSoft}
          style={styles.input}
        />
      ) : null}
      {props.notice ? <Text style={styles.notice}>{props.notice}</Text> : null}
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
      <Pressable disabled={props.loading} onPress={props.onSubmit} style={[styles.primary, props.loading && { opacity: 0.7 }]}>
        {props.loading ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>{props.button}</Text>}
      </Pressable>
      <Pressable onPress={props.onFooter} style={styles.footerLink}><Text style={styles.link}>{props.footer}</Text></Pressable>
      {props.secondaryFooter && props.onSecondaryFooter ? (
        <Pressable onPress={props.onSecondaryFooter} style={styles.footerLink}><Text style={styles.linkMuted}>{props.secondaryFooter}</Text></Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 24, justifyContent: "center" },
  back: { position: "absolute", top: 16, left: 18, flexDirection: "row", alignItems: "center", zIndex: 2 },
  backText: { color: C.ink, fontWeight: "800" },
  logoWrap: { alignItems: "center", marginBottom: 28 },
  panel: { backgroundColor: C.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: C.border },
  feature: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
  featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" },
  featureTitle: { color: C.ink, fontWeight: "900" },
  featureText: { color: C.muted, fontSize: 12, marginTop: 2, fontWeight: "600" },
  primary: { backgroundColor: C.ink, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 },
  secondary: { backgroundColor: C.bgElevated, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: C.border },
  secondaryText: { color: C.ink, fontWeight: "900", fontSize: 15 },
  formTitle: { fontSize: 26, fontWeight: "900", color: C.ink, marginBottom: 16, letterSpacing: -0.5 },
  input: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 16, fontWeight: "700", marginTop: 10 },
  helperLarge: { color: C.muted, fontSize: 14, lineHeight: 20, fontWeight: "700", marginBottom: 4 },
  error: { color: C.danger, fontWeight: "800", marginTop: 10 },
  notice: { color: C.success, fontWeight: "800", marginTop: 10, lineHeight: 18 },
  footerLink: { alignItems: "center", marginTop: 14 },
  link: { color: C.accent, fontWeight: "900" },
  linkMuted: { color: C.muted, fontWeight: "900" },
});
