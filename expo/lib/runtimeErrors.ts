import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { APP_VERSION } from "@/constants/appInfo";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const PENDING_RUNTIME_REPORTS_KEY = "@sudoduel/pending-runtime-reports";
const MAX_PENDING_REPORTS = 10;
const DEDUPE_WINDOW_MS = 2_000;

type RuntimeErrorScope = "react_boundary" | "global_js" | "unhandled_promise";

export interface RuntimeErrorReport {
  id: string;
  createdAt: string;
  scope: RuntimeErrorScope;
  fatal: boolean;
  route: string | null;
  name: string;
  message: string;
  stack: string | null;
  componentStack: string | null;
  appVersion: string;
  platform: string;
}

interface RuntimeErrorContext {
  route: string | null;
  userId: string | null;
}

interface ReportRuntimeErrorOptions {
  scope: RuntimeErrorScope;
  fatal?: boolean;
  route?: string | null;
  componentStack?: string | null;
}

let currentContext: RuntimeErrorContext = { route: null, userId: null };
let globalHandlerInstalled = false;
let previousGlobalHandler: ((error: unknown, isFatal?: boolean) => void) | null = null;
let lastReportSignature: string | null = null;
let lastReportAt = 0;

function safeString(value: unknown, maxLength = 600): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeMultiline(value: unknown, maxLength = 1600): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\u0000/g, "").trim().slice(0, maxLength);
  return normalized.length > 0 ? normalized : null;
}

function normalizeError(error: unknown): { name: string; message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      name: safeString(error.name || "Error", 120) || "Error",
      message: safeString(error.message || "Unknown runtime error", 800) || "Unknown runtime error",
      stack: safeMultiline(error.stack),
    };
  }

  const fallback = safeString(String(error), 800) || "Unknown runtime error";
  return {
    name: "Error",
    message: fallback,
    stack: null,
  };
}

function buildSignature(report: Omit<RuntimeErrorReport, "id" | "createdAt">): string {
  return JSON.stringify({
    scope: report.scope,
    fatal: report.fatal,
    route: report.route,
    name: report.name,
    message: report.message,
  });
}

function shouldDeduplicate(signature: string): boolean {
  const now = Date.now();
  if (lastReportSignature === signature && now - lastReportAt < DEDUPE_WINDOW_MS) {
    return true;
  }
  lastReportSignature = signature;
  lastReportAt = now;
  return false;
}

function createReport(error: unknown, options: ReportRuntimeErrorOptions): RuntimeErrorReport | null {
  const normalized = normalizeError(error);
  const route = options.route ?? currentContext.route;
  const report: Omit<RuntimeErrorReport, "id" | "createdAt"> = {
    scope: options.scope,
    fatal: Boolean(options.fatal),
    route: route ? safeString(route, 200) : null,
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack,
    componentStack: safeMultiline(options.componentStack),
    appVersion: APP_VERSION,
    platform: Platform.OS,
  };

  const signature = buildSignature(report);
  if (shouldDeduplicate(signature)) return null;

  return {
    ...report,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
}

function formatReportMessage(report: RuntimeErrorReport): string {
  const lines = [
    "[Automatic runtime error report]",
    `Scope: ${report.scope}`,
    `Fatal: ${report.fatal ? "Yes" : "No"}`,
    `Platform: ${report.platform}`,
    `App version: ${report.appVersion}`,
    `Route: ${report.route ?? "Unknown"}`,
    `Error: ${report.name}`,
    `Message: ${report.message}`,
  ];

  if (report.stack) {
    lines.push("", "Stack:", report.stack);
  }

  if (report.componentStack) {
    lines.push("", "Component stack:", report.componentStack);
  }

  return lines.join("\n");
}

async function readPendingReports(): Promise<RuntimeErrorReport[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_RUNTIME_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as RuntimeErrorReport[] : [];
  } catch {
    return [];
  }
}

async function writePendingReports(reports: RuntimeErrorReport[]): Promise<void> {
  try {
    if (reports.length === 0) {
      await AsyncStorage.removeItem(PENDING_RUNTIME_REPORTS_KEY);
      return;
    }
    await AsyncStorage.setItem(PENDING_RUNTIME_REPORTS_KEY, JSON.stringify(reports.slice(-MAX_PENDING_REPORTS)));
  } catch {
    // Ignore local persistence failures. The app should keep running.
  }
}

async function queuePendingReport(report: RuntimeErrorReport): Promise<void> {
  const reports = await readPendingReports();
  reports.push(report);
  await writePendingReports(reports);
}

async function submitReport(report: RuntimeErrorReport, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      category: "bug_report",
      message: formatReportMessage(report),
      app_version: report.appVersion,
    });
    return !error;
  } catch {
    return false;
  }
}

export function setRuntimeErrorContext(partial: Partial<RuntimeErrorContext>) {
  currentContext = {
    route: partial.route === undefined ? currentContext.route : partial.route,
    userId: partial.userId === undefined ? currentContext.userId : partial.userId,
  };
}

export async function reportRuntimeError(error: unknown, options: ReportRuntimeErrorOptions): Promise<void> {
  const report = createReport(error, options);
  if (!report) return;

  const userId = currentContext.userId;
  if (userId) {
    const sent = await submitReport(report, userId);
    if (sent) return;
  }

  await queuePendingReport(report);
}

export async function flushPendingRuntimeErrorReports(userId: string | null | undefined): Promise<void> {
  if (!userId || !isSupabaseConfigured) return;

  const queued = await readPendingReports();
  if (queued.length === 0) return;

  const remaining: RuntimeErrorReport[] = [];
  for (const report of queued) {
    const sent = await submitReport(report, userId);
    if (!sent) remaining.push(report);
  }

  await writePendingReports(remaining);
}

export function installGlobalErrorHandlers() {
  if (globalHandlerInstalled) return;
  globalHandlerInstalled = true;

  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | null; setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void } }).ErrorUtils;

  previousGlobalHandler = errorUtils?.getGlobalHandler?.() ?? null;

  errorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
    void reportRuntimeError(error, {
      scope: "global_js",
      fatal: Boolean(isFatal),
    });
    previousGlobalHandler?.(error, isFatal);
  });

  const rejectionHandler = (event: PromiseRejectionEvent | { reason?: unknown }) => {
    void reportRuntimeError(event.reason, {
      scope: "unhandled_promise",
      fatal: false,
    });
  };

  if (typeof globalThis.addEventListener === "function") {
    try {
      globalThis.addEventListener("unhandledrejection", rejectionHandler as EventListener);
    } catch {
      // Ignore platform/runtime mismatch.
    }
  }
}
