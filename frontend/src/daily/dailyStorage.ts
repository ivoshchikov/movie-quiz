export interface DailyAnswer { selected: string; correct: boolean; seconds: number; }
export interface DailyRun {
  version: 1; userId: string; date: string; questionId: number; startedAt: number;
  options: string[]; pending?: DailyAnswer;
}
const prefix = "hq:daily:run:";
const memory = new Map<string, DailyRun>();
const activeDays = new Map<string, string>();
export function dailyRunKey(userId: string, date: string) { return `${prefix}${userId}:${date}`; }
const pointerKey = (userId: string) => `hq:daily:day:${userId}`;
const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function parseRun(value: unknown, userId: string, date: string): DailyRun | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<DailyRun>;
  if (row.version !== 1 || row.userId !== userId || row.date !== date || !validDate(date) ||
    !Number.isInteger(row.questionId) || !Number.isFinite(row.startedAt) || row.startedAt! <= 0 || row.startedAt! > Date.now() + 1000 ||
    !Array.isArray(row.options) || row.options.length !== 4 || !row.options.every(option => typeof option === "string" && !!option.trim()) || new Set(row.options).size !== 4) return null;
  if (row.pending && (typeof row.pending.selected !== "string" || !row.options.includes(row.pending.selected) ||
    typeof row.pending.correct !== "boolean" || !Number.isInteger(row.pending.seconds) || row.pending.seconds < 1)) return null;
  return row as DailyRun;
}
export function readDailyRun(userId: string, date: string) {
  const key = dailyRunKey(userId, date);
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? parseRun(JSON.parse(raw), userId, date) : null;
    if (parsed) { memory.set(key, parsed); return parsed; }
  } catch { /* A denied or corrupt store must not prevent play in this document. */ }
  return parseRun(memory.get(key), userId, date);
}
export function pointToDaily(userId: string, date: string) {
  activeDays.set(userId, date);
  try { localStorage.setItem(pointerKey(userId), date); return true; } catch { return false; }
}
export function initialDailyDate(userId: string, today: string) {
  let active = activeDays.get(userId);
  try { active = localStorage.getItem(pointerKey(userId)) ?? active; } catch { /* Fall back to this document. */ }
  return validDate(active) && active <= today && readDailyRun(userId, active)?.pending ? active : today;
}
export function writeDailyRun(run: DailyRun) {
  const key = dailyRunKey(run.userId, run.date);
  memory.set(key, run);
  const pointerSaved = pointToDaily(run.userId, run.date);
  try { localStorage.setItem(key, JSON.stringify(run)); return pointerSaved; } catch { return false; }
}
export function clearDailyRun(userId: string, date: string) {
  memory.delete(dailyRunKey(userId, date));
  try { localStorage.removeItem(dailyRunKey(userId, date)); } catch { /* Server-confirmed results remain authoritative. */ }
}
