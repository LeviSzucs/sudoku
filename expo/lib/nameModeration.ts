const BLOCKED_TERMS = [
  "fuck",
  "fuk",
  "shit",
  "bitch",
  "cunt",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
  "rapist",
  "porn",
  "sexcam",
];

function normalizeNameValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function containsBlockedNameTerm(value: string): boolean {
  const normalized = normalizeNameValue(value);
  if (!normalized) return false;
  return BLOCKED_TERMS.some((term) => normalized.includes(term));
}

export function validateSafeProfileName(value: string): string | null {
  return containsBlockedNameTerm(value) ? "Please choose a different name." : null;
}
