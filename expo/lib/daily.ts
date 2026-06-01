export function getDailyDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getDailyDateWindow(dateStr: string): { startIso: string; endIso: string } {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
