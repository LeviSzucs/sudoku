import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Shield, Trophy } from "lucide-react-native";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import { C } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

type AuthStep = "splash" | "signup" | "login";

export default function AuthScreen() {
  const params = useLocalSearchParams<{ step?: AuthStep }>();
  const initialStep = (params.step as AuthStep | undefined) ?? "splash";
  const [step, setStep] = useState<AuthStep>(initialStep);
  const auth = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const finishAuth = () => router.replace("/(tabs)");

  const createAccount = async () => {
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const result = await auth.signUp(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error ?? "Unable to create account."); return; }
    router.replace("/username-setup");
  };

  const logIn = async () => {
    setError(null);
    setLoading(true);
    const result = await auth.signIn(email, password);
    setLoading(false);
    if (!result.ok) { setError(result.error ?? "Unable to log in."); return; }
    finishAuth();
  };

  return <SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {step !== "splash" ? <Pressable onPress={() => setStep("splash")} style={styles.back}><ChevronLeft color={C.ink} size={22} /><Text style={styles.backText}>Back</Text></Pressable> : null}
    <View style={styles.logoWrap}><BrandMark size={78} showWordmark tagline="Sudoku, made competitive." /></View>
    {step === "splash" ? <View style={styles.panel}><Feature icon={<Trophy size={18} color={C.gold} />} title="Compete fairly" text="Same boards, score-first leaderboards, skill-based RP." /><Feature icon={<Shield size={18} color={C.accent} />} title="Cloud profile" text="Save XP, badges, settings and results to your account." /><PrimaryButton label="Create account" onPress={() => setStep("signup")} /><SecondaryButton label="Log in" onPress={() => setStep("login")} /></View> : null}
    {step === "signup" ? <AuthForm title="Create account" email={email} password={password} confirm={confirm} setEmail={setEmail} setPassword={setPassword} setConfirm={setConfirm} showConfirm error={error} loading={loading} button="Create account" onSubmit={createAccount} footer="Already have an account? Log in" onFooter={() => setStep("login")} /> : null}
    {step === "login" ? <AuthForm title="Log in" email={email} password={password} confirm={confirm} setEmail={setEmail} setPassword={setPassword} setConfirm={setConfirm} error={error} loading={loading} button="Log in" onSubmit={logIn} footer="New here? Create account" onFooter={() => setStep("signup")} forgot /> : null}
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <View style={styles.feature}><View style={styles.featureIcon}>{icon}</View><View style={{ flex: 1 }}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text></View></View>; }
function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{label}</Text></Pressable>; }
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.secondary}><Text style={styles.secondaryText}>{label}</Text></Pressable>; }
function AuthForm(props: { title: string; email: string; password: string; confirm: string; setEmail: (v: string) => void; setPassword: (v: string) => void; setConfirm: (v: string) => void; showConfirm?: boolean; error: string | null; loading: boolean; button: string; onSubmit: () => void; footer: string; onFooter: () => void; forgot?: boolean }) { return <View style={styles.panel}><Text style={styles.formTitle}>{props.title}</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={props.email} onChangeText={props.setEmail} placeholder="Email" placeholderTextColor={C.mutedSoft} style={styles.input} /><TextInput secureTextEntry value={props.password} onChangeText={props.setPassword} placeholder="Password" placeholderTextColor={C.mutedSoft} style={styles.input} />{props.showConfirm ? <TextInput secureTextEntry value={props.confirm} onChangeText={props.setConfirm} placeholder="Confirm password" placeholderTextColor={C.mutedSoft} style={styles.input} /> : null}{props.forgot ? <Text style={styles.helper}>Forgot password support will be added next.</Text> : null}{props.error ? <Text style={styles.error}>{props.error}</Text> : null}<Pressable disabled={props.loading} onPress={props.onSubmit} style={[styles.primary, props.loading && { opacity: 0.7 }]}>{props.loading ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>{props.button}</Text>}</Pressable><Pressable onPress={props.onFooter} style={{ alignItems: "center", marginTop: 14 }}><Text style={styles.link}>{props.footer}</Text></Pressable></View>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: C.bg }, content: { flexGrow: 1, padding: 24, justifyContent: "center" }, back: { position: "absolute", top: 16, left: 18, flexDirection: "row", alignItems: "center", zIndex: 2 }, backText: { color: C.ink, fontWeight: "800" }, logoWrap: { alignItems: "center", marginBottom: 28 }, logo: { width: 78, height: 78, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 }, appName: { fontSize: 32, fontWeight: "900", color: C.ink, letterSpacing: -0.8 }, tagline: { color: C.muted, fontWeight: "700", textAlign: "center", marginTop: 6 }, panel: { backgroundColor: C.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: C.border }, feature: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 }, featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" }, featureTitle: { color: C.ink, fontWeight: "900" }, featureText: { color: C.muted, fontSize: 12, marginTop: 2, fontWeight: "600" }, primary: { backgroundColor: C.ink, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 16 }, primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 }, secondary: { backgroundColor: C.bgElevated, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: C.border }, secondaryText: { color: C.ink, fontWeight: "900", fontSize: 15 }, guest: { alignItems: "center", paddingVertical: 14 }, guestText: { color: C.accent, fontWeight: "900" }, guestNote: { color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 17, fontWeight: "600" }, formTitle: { fontSize: 26, fontWeight: "900", color: C.ink, marginBottom: 16, letterSpacing: -0.5 }, input: { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 16, fontWeight: "700", marginTop: 10 }, helper: { color: C.muted, fontSize: 12, marginTop: 8, fontWeight: "600" }, error: { color: C.danger, fontWeight: "800", marginTop: 10 }, link: { color: C.accent, fontWeight: "900" } });
