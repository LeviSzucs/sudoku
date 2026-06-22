import { Linking } from "react-native";

import { SUPPORT_EMAIL, SUPPORT_EMAIL_LINK } from "@/constants/legal";

interface SupportEmailOptions {
  subject?: string;
  body?: string;
}

export function buildSupportMailto({ subject, body }: SupportEmailOptions = {}): string {
  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  const query = parts.join("&");
  return query ? `mailto:${SUPPORT_EMAIL}?${query}` : SUPPORT_EMAIL_LINK;
}

export async function openSupportEmail(options: SupportEmailOptions = {}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = buildSupportMailto(options);

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { ok: false, error: `Could not open an email app for ${SUPPORT_EMAIL}.` };
    }
    await Linking.openURL(url);
    return { ok: true };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : `Could not open an email app for ${SUPPORT_EMAIL}.`,
    };
  }
}
