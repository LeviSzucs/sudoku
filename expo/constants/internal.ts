export const SHOW_INTERNAL_QA_TOOLS =
  (typeof globalThis !== "undefined" && Boolean((globalThis as { __DEV__?: boolean }).__DEV__)) ||
  process.env.EXPO_PUBLIC_ENABLE_QA_TOOLS === "true";
