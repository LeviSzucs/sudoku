import { router, useLocalSearchParams } from "expo-router";
import { Apple, ChevronLeft, LockKeyhole, Mail, Shield, Trophy, Users } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BrandMark from "@/components/BrandMark";
import { C } from "@/constants/colors";
import { SUPPORT_EMAIL_LABEL } from "@/constants/legal";
import { useAuth } from "@/hooks/useAuth";

type AuthStep = "splash" | "signup" | "login" | "reset_request" | "reset_sent" | "reset_update";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function friendlyAuthError(message?: string): string {
  const text = (message ?? "").toLowerCase();
  if (text.includes("user is banned") || text.includes("banned")) {
    return `This account was previously deleted and cannot be restored automatically yet. Please contact support at ${SUPPORT_EMAIL_LABEL} if you want to use the same sign-in again.`;
  }
  if (text.includes("invalid login") || text.includes("invalid credentials")) return "That email or password does not look right. Please try again.";
  if (text.includes("already registered") || text.includes("already exists")) return "An account with this email already exists. Try logging in instead.";
  if (text.includes("email not confirmed")) return "Please check your email for any confirmation steps, then try again.";
  if (text.includes("network")) return "We could not reach the server just now. Please check your connection and try again.";
  if (text.includes("password")) return message ?? "Please check your password and try again.";
  if (text.includes("email")) return message ?? "Please check your email address and try again.";
  return message ?? "Something went wrong. Please try again.";
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function buttonLabel(step: AuthStep, loading: boolean): string {
  if (!loading) {
    if (step === "signup") return "Create account";
    if (step === "login") return "Log in";
    if (step === "reset_request") return "Send reset email";
    return "Continue";
  }
  if (step === "signup") return "Creating account...";
  if (step === "login") return "Signing you in...";
  if (step === "reset_request") return "Sending reset email...";
  return "Saving...";
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
  const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(null);

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
    setNotice("Your password has been updated. You can continue into SudoDuel.");
  };

  const startSocialSignIn = async (provider: "apple" | "google") => {
    clearMessages();
    setSocialLoading(provider);
    const result = await auth.signInWithProvider(provider);
    setSocialLoading(null);
    if (!result.ok && !result.cancelled) {
      setError(friendlyAuthError(result.error));
    }
  };

  const headerCopy = useMemo(() => {
    switch (step) {
      case "signup":
        return {
          eyebrow: "Create your account",
          title: "Start your first duel",
          subtitle: "Use email and password to save your profile, puzzle history, friends, and results.",
        };
      case "login":
        return {
          eyebrow: "Welcome back",
          title: "Pick up where you left off",
          subtitle: "Log in to keep your profile, streaks, badges, and competitive progress in sync.",
        };
      case "reset_request":
        return {
          eyebrow: "Password help",
          title: "Reset your password",
          subtitle: "We will send a secure link so you can get back into your account.",
        };
      case "reset_sent":
        return {
          eyebrow: "Check your inbox",
          title: "Reset email sent",
          subtitle: "Open the link on this device, then come back to finish setting your new password.",
        };
      case "reset_update":
        return {
          eyebrow: "New password",
          title: "Choose a new password",
          subtitle: "Once saved, you can continue straight into the app.",
        };
      default:
        return {
          eyebrow: "Competitive Sudoku with friends",
          title: "Play solo. Duel friends. Climb the ranks.",
          subtitle: "SudoDuel blends polished Sudoku play with daily challenges, head-to-head duels, and lasting progression.",
        };
    }
  }, [step]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            {step !== "splash" ? (
              <Pressable onPress={() => goTo(step === "reset_update" ? "login" : "splash")} style={styles.back}>
                <ChevronLeft color={C.ink} size={18} />
                <Text style={styles.backText}>Back</Text>
              </Pressable>
            ) : null}

            <View style={styles.heroCard}>
              <View style={styles.heroGlow} />
              <View style={styles.logoWrap}>
                <BrandMark size={82} showWordmark />
              </View>
              <Text style={styles.eyebrow}>{headerCopy.eyebrow}</Text>
              <Text style={styles.heroTitle}>{headerCopy.title}</Text>
              <Text style={styles.heroSubtitle}>{headerCopy.subtitle}</Text>

              <View style={styles.heroStats}>
                <HeroPill icon={<Trophy size={15} color={C.gold} />} label="Daily play" />
                <HeroPill icon={<Users size={15} color={C.accent} />} label="Head-to-head" />
                <HeroPill icon={<Shield size={15} color={C.success} />} label="Saved progress" />
              </View>
            </View>

            {step === "splash" ? (
              <View style={styles.panel}>
                <Feature
                  icon={<Trophy size={18} color={C.gold} />}
                  title="Compete fairly"
                  text="Solve the same boards, compare clean scores, and build real ranked progress."
                />
                <Feature
                  icon={<Users size={18} color={C.accent} />}
                  title="Challenge friends"
                  text="Send head-to-head Sudoku challenges and keep the rivalry going."
                />
                <Feature
                  icon={<Shield size={18} color={C.success} />}
                  title="Keep your progress"
                  text="Your account keeps stats, streaks, badges, settings, and social activity together."
                />
                <SocialSignInSection
                  socialLoading={socialLoading}
                  onApple={() => startSocialSignIn("apple")}
                  onGoogle={() => startSocialSignIn("google")}
                  onEmail={() => goTo("signup")}
                  emailLabel="Continue with email"
                  footer="Already have an account? Log in"
                  onFooter={() => goTo("login")}
                />
                {error ? <MessageBanner tone="error" text={error} /> : null}
              </View>
            ) : null}

            {step === "signup" ? (
              <AuthForm
                title="Create account"
                subtitle="You can customise your avatar later in Profile."
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
                disabled={loading || socialLoading !== null}
                socialLoading={socialLoading}
                onApple={() => startSocialSignIn("apple")}
                onGoogle={() => startSocialSignIn("google")}
                button={buttonLabel(step, loading)}
                onSubmit={createAccount}
                footer="Already have an account? Log in"
                onFooter={() => goTo("login")}
              />
            ) : null}

            {step === "login" ? (
              <AuthForm
                title="Log in"
                subtitle="Use the email and password linked to your SudoDuel account."
                email={email}
                password={password}
                confirm={confirm}
                setEmail={setEmail}
                setPassword={setPassword}
                setConfirm={setConfirm}
                error={error}
                notice={notice}
                loading={loading}
                disabled={loading || socialLoading !== null}
                socialLoading={socialLoading}
                onApple={() => startSocialSignIn("apple")}
                onGoogle={() => startSocialSignIn("google")}
                button={buttonLabel(step, loading)}
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
              <InfoPanel
                title="Check your email"
                body={`If an account exists for ${email.trim()}, we have sent a password reset link. Open it on this device to continue.`}
                actionLabel="Back to log in"
                onAction={() => goTo("login")}
              />
            ) : null}

            {step === "reset_update" ? (
              <AuthForm
                title="Set new password"
                subtitle="Choose something memorable. You can change it again later from the reset flow if needed."
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
                disabled={loading || socialLoading !== null}
                socialLoading={socialLoading}
                onApple={() => startSocialSignIn("apple")}
                onGoogle={() => startSocialSignIn("google")}
                button={notice ? "Continue to SudoDuel" : buttonLabel(step, loading)}
                onSubmit={notice ? () => router.replace("/(tabs)") : updatePassword}
                footer="Back to log in"
                onFooter={() => goTo("login")}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HeroPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.heroPill}>
      {icon}
      <Text style={styles.heroPillText}>{label}</Text>
    </View>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureBody}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureText}>{text}</Text>
      </View>
    </View>
  );
}

function MessageBanner({ tone, text }: { tone: "error" | "notice"; text: string }) {
  return (
    <View style={[styles.banner, tone === "error" ? styles.errorBanner : styles.noticeBanner]}>
      <Text style={[styles.bannerText, tone === "error" ? styles.errorTextStrong : styles.noticeText]}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primary, disabled && styles.disabledPrimary]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.secondary, disabled && styles.disabledPrimary]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function SocialSignInSection(props: {
  socialLoading: "apple" | "google" | null;
  onApple: () => void;
  onGoogle: () => void;
  onEmail?: () => void;
  emailLabel?: string;
  footer?: string;
  onFooter?: () => void;
}) {
  const busy = props.socialLoading !== null;
  return (
    <View style={styles.socialSection}>
      {Platform.OS === "ios" ? (
        <SocialButton
          label="Continue with Apple"
          icon={<Apple size={18} color="#FFFFFF" />}
          tone="apple"
          loading={props.socialLoading === "apple"}
          disabled={busy}
          onPress={props.onApple}
        />
      ) : null}
      <SocialButton
        label="Continue with Google"
        icon={<View style={styles.googleBadge}><Text style={styles.googleBadgeText}>G</Text></View>}
        tone="card"
        loading={props.socialLoading === "google"}
        disabled={busy}
        onPress={props.onGoogle}
      />
      {props.onEmail && props.emailLabel ? (
        <>
          <Divider label="or" />
          <SecondaryButton label={props.emailLabel} onPress={props.onEmail} disabled={busy} />
        </>
      ) : (
        <Divider label="or use email" />
      )}
      {props.footer && props.onFooter ? (
        <Pressable onPress={props.onFooter} style={styles.footerLink}><Text style={styles.link}>{props.footer}</Text></Pressable>
      ) : null}
    </View>
  );
}

function SocialButton({
  label,
  icon,
  tone,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  tone: "apple" | "card";
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const dark = tone === "apple";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.socialButton,
        dark ? styles.socialButtonDark : styles.socialButtonLight,
        disabled && styles.disabledPrimary,
      ]}
    >
      <View style={styles.socialIconWrap}>{loading ? <ActivityIndicator color={dark ? "#FFFFFF" : C.ink} /> : icon}</View>
      <Text style={[styles.socialButtonText, dark ? styles.socialButtonTextDark : styles.socialButtonTextLight]}>{label}</Text>
      <View style={styles.socialButtonSpacer} />
    </Pressable>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function Field({
  icon,
  label,
  children,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  helper?: string;
}) {
  return (
    <View style={styles.fieldBlock}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldIcon}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

function InfoPanel({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel: string; onAction: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.formTitle}>{title}</Text>
      <Text style={styles.formSubtitle}>{body}</Text>
      <PrimaryButton label={actionLabel} onPress={onAction} />
    </View>
  );
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
      <Text style={styles.formSubtitle}>Enter your account email and we will send a secure reset link.</Text>
      <Field icon={<Mail size={16} color={C.accent} />} label="Email">
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={props.email}
          onChangeText={props.setEmail}
          placeholder="name@example.com"
          placeholderTextColor={C.mutedSoft}
          style={styles.input}
        />
      </Field>
      {props.error ? <MessageBanner tone="error" text={props.error} /> : null}
      <Pressable disabled={props.loading} onPress={props.onSubmit} style={[styles.primary, props.loading && styles.disabledPrimary]}>
        {props.loading ? <ActivityIndicator color="#FBF8F2" /> : <Text style={styles.primaryText}>Send reset email</Text>}
      </Pressable>
      <Pressable onPress={props.onBack} style={styles.footerLink}><Text style={styles.link}>Back to log in</Text></Pressable>
    </View>
  );
}

function AuthForm(props: {
  title: string;
  subtitle: string;
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
  disabled?: boolean;
  socialLoading: "apple" | "google" | null;
  onApple: () => void;
  onGoogle: () => void;
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
      <Text style={styles.formSubtitle}>{props.subtitle}</Text>
      <SocialSignInSection socialLoading={props.socialLoading} onApple={props.onApple} onGoogle={props.onGoogle} />
      {!props.hideEmail ? (
        <Field icon={<Mail size={16} color={C.accent} />} label="Email">
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={props.email}
            onChangeText={props.setEmail}
            placeholder="name@example.com"
            placeholderTextColor={C.mutedSoft}
            style={styles.input}
          />
        </Field>
      ) : null}
      <Field
        icon={<LockKeyhole size={16} color={C.gold} />}
        label="Password"
        helper={props.showConfirm ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
      >
        <TextInput
          secureTextEntry
          autoComplete="password"
          value={props.password}
          onChangeText={props.setPassword}
          placeholder="Enter your password"
          placeholderTextColor={C.mutedSoft}
          style={styles.input}
        />
      </Field>
      {props.showConfirm ? (
        <Field icon={<LockKeyhole size={16} color={C.gold} />} label="Confirm password">
          <TextInput
            secureTextEntry
            autoComplete="password"
            value={props.confirm}
            onChangeText={props.setConfirm}
            placeholder="Repeat your password"
            placeholderTextColor={C.mutedSoft}
            style={styles.input}
          />
        </Field>
      ) : null}
      {props.notice ? <MessageBanner tone="notice" text={props.notice} /> : null}
      {props.error ? <MessageBanner tone="error" text={props.error} /> : null}
      <Pressable disabled={props.disabled || props.loading} onPress={props.onSubmit} style={[styles.primary, (props.disabled || props.loading) && styles.disabledPrimary]}>
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
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },
  shell: { width: "100%", maxWidth: 540, alignSelf: "center", gap: 16, paddingVertical: 12 },
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4, paddingVertical: 4 },
  backText: { color: C.ink, fontWeight: "800", fontSize: 14 },
  heroCard: {
    backgroundColor: C.card,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#15171C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  heroGlow: {
    position: "absolute",
    right: -18,
    top: -24,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: C.amberSoft,
    opacity: 0.6,
  },
  logoWrap: { alignItems: "flex-start", marginBottom: 16 },
  eyebrow: {
    color: C.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroTitle: {
    color: C.ink,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    marginBottom: 10,
  },
  heroSubtitle: {
    color: C.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  heroStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroPillText: { color: C.ink, fontSize: 12, fontWeight: "800" },
  panel: {
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#15171C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  feature: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
  featureBody: { flex: 1 },
  featureIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.bgElevated, alignItems: "center", justifyContent: "center" },
  featureTitle: { color: C.ink, fontWeight: "900", fontSize: 15 },
  featureText: { color: C.muted, fontSize: 13, lineHeight: 18, marginTop: 3, fontWeight: "600" },
  formTitle: { fontSize: 28, lineHeight: 32, fontWeight: "900", color: C.ink, marginBottom: 8 },
  formSubtitle: { color: C.muted, fontSize: 14, lineHeight: 21, fontWeight: "600", marginBottom: 6 },
  socialSection: { marginTop: 18 },
  socialButton: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    marginTop: 10,
  },
  socialButtonDark: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  socialButtonLight: {
    backgroundColor: C.bgElevated,
    borderColor: C.border,
  },
  socialIconWrap: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "900",
  },
  socialButtonTextDark: { color: "#FFFFFF" },
  socialButtonTextLight: { color: C.ink },
  socialButtonSpacer: { width: 24 },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  googleBadgeText: {
    color: "#4285F4",
    fontSize: 12,
    fontWeight: "900",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fieldBlock: { marginTop: 14 },
  fieldHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: C.ink, fontWeight: "900", fontSize: 13 },
  input: {
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: C.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  helper: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: "700" },
  banner: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  errorBanner: { backgroundColor: "#FFF3F0", borderColor: "#F4D4D4" },
  noticeBanner: { backgroundColor: "#F0F7F2", borderColor: "#CFE3D4" },
  bannerText: { fontSize: 13, lineHeight: 19, fontWeight: "800" },
  noticeText: { color: C.success },
  errorTextStrong: { color: C.danger },
  primary: { backgroundColor: C.ink, borderRadius: 18, paddingVertical: 16, alignItems: "center", marginTop: 18, minHeight: 56, justifyContent: "center" },
  disabledPrimary: { opacity: 0.74 },
  primaryText: { color: "#FBF8F2", fontWeight: "900", fontSize: 15 },
  secondary: { backgroundColor: C.bgElevated, borderRadius: 18, paddingVertical: 16, alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: C.border },
  secondaryText: { color: C.ink, fontWeight: "900", fontSize: 15 },
  footerLink: { alignItems: "center", marginTop: 14 },
  link: { color: C.accent, fontWeight: "900", textAlign: "center" },
  linkMuted: { color: C.muted, fontWeight: "900", textAlign: "center" },
});
