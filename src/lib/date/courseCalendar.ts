/**
 * 課程日曆：全站唯一的日期邏輯來源。
 *
 * 設計原則（非常重要，修改前請先讀）：
 * 1. 所有函式都以 IsoDate（'YYYY-MM-DD' 字串）為輸入與輸出，不傳遞 Date 物件。
 * 2. 只有 getTodayInTaipei() 會接觸「現在時間」。其餘全是純函式，
 *    給同樣的輸入永遠得到同樣的輸出 → 可以完整測試，且不受使用者所在時區影響。
 * 3. 內部日數運算一律走 UTC（Date.UTC），完全避開日光節約時間造成的 ±1 天誤差。
 */

/** 'YYYY-MM-DD' 格式的日期字串（台北當地日期） */
export type IsoDate = string;

/** 第 1 至第 17 週 */
export type WeekNumber = number;

/** 一週中的第幾天，1 = 星期日，7 = 星期六 */
export type DayIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 備考期間的四個階段。
 * before   ：2026-08-09 之前 → 準備頁
 * during   ：2026-08-09 ~ 2026-12-05 → 第 1 至第 17 週
 * exam-day ：2026-12-06 → 考試當日頁
 * after    ：2026-12-07 之後 → 備考完成摘要
 */
export type CoursePhase = 'before' | 'during' | 'exam-day' | 'after';

export const TIME_ZONE = 'Asia/Taipei' as const;

/** 複習開始日（星期日） */
export const COURSE_START: IsoDate = '2026-08-09';
/** 完整複習期間最後一天（星期六） */
export const COURSE_END: IsoDate = '2026-12-05';
/** 考試日（星期日） */
export const EXAM_DATE: IsoDate = '2026-12-06';
/** 總週數 */
export const TOTAL_WEEKS = 17;
/** 每週天數 */
export const DAYS_PER_WEEK = 7;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/** 用來把 Date 轉成台北當地的 'YYYY-MM-DD'。sv-SE 的輸出格式恰好是 ISO 日期。 */
const taipeiDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// ---------------------------------------------------------------------------
// 基礎工具
// ---------------------------------------------------------------------------

/** 檢查字串是否為合法的 'YYYY-MM-DD'（含實際存在性，例如 2026-02-30 為 false） */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

function assertIsoDate(value: string, label = 'date'): void {
  if (!isValidIsoDate(value)) {
    throw new RangeError(`${label} 必須是合法的 YYYY-MM-DD 字串，收到：${String(value)}`);
  }
}

/** 轉成「自 1970-01-01 起的天數」，用於日期加減與比較 */
function toEpochDay(iso: IsoDate): number {
  assertIsoDate(iso);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromEpochDay(epochDay: number): IsoDate {
  const dt = new Date(epochDay * MS_PER_DAY);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 兩個日期相差幾天（to - from）。同日為 0，to 較晚為正數。 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

/** 日期加上 n 天（n 可為負） */
export function addDays(iso: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(iso) + days);
}

/** 星期幾：0 = 星期日 ... 6 = 星期六 */
export function getDayOfWeek(iso: IsoDate): number {
  // 1970-01-01（epochDay 0）是星期四，故 +4
  return (((toEpochDay(iso) + 4) % 7) + 7) % 7;
}

// ---------------------------------------------------------------------------
// 「現在」的唯一入口
// ---------------------------------------------------------------------------

/**
 * 取得台北當地的今天。這是全站唯一讀取系統時間的地方。
 *
 * 顯式指定 timeZone，因此即使使用者出國、或裝置時區被改成別的地方，
 * 網站仍以台北日期判定週次，與考試地點一致。
 *
 * @param now 可注入的時間點，測試時使用；正式執行時不要傳。
 */
export function getTodayInTaipei(now: Date = new Date()): IsoDate {
  return taipeiDateFormatter.format(now);
}

// ---------------------------------------------------------------------------
// 課程階段與週次
// ---------------------------------------------------------------------------

/** 判定該日期屬於備考期間的哪個階段 */
export function getPhase(today: IsoDate): CoursePhase {
  assertIsoDate(today, 'today');
  if (daysBetween(today, COURSE_START) > 0) return 'before';
  if (daysBetween(today, COURSE_END) >= 0) return 'during';
  if (today === EXAM_DATE) return 'exam-day';
  return 'after';
}

/**
 * 該日期屬於第幾週（1–17）。
 * 不在複習期間內（開始前、考試當日、考後）一律回傳 null。
 */
export function getWeekNumber(today: IsoDate): WeekNumber | null {
  if (getPhase(today) !== 'during') return null;
  const offset = daysBetween(COURSE_START, today);
  const week = Math.floor(offset / DAYS_PER_WEEK) + 1;
  return week >= 1 && week <= TOTAL_WEEKS ? week : null;
}

/**
 * 該日期是所屬週的第幾天（1 = 星期日 ... 7 = 星期六）。
 * 不在複習期間內回傳 null。
 */
export function getDayIndexInWeek(today: IsoDate): DayIndex | null {
  if (getPhase(today) !== 'during') return null;
  const offset = daysBetween(COURSE_START, today);
  return ((offset % DAYS_PER_WEEK) + 1) as DayIndex;
}

/** 指定週次的起訖日（週日 → 週六） */
export function getWeekRange(week: WeekNumber): { start: IsoDate; end: IsoDate } {
  if (!Number.isInteger(week) || week < 1 || week > TOTAL_WEEKS) {
    throw new RangeError(`週次必須是 1 至 ${TOTAL_WEEKS} 的整數，收到：${String(week)}`);
  }
  const start = addDays(COURSE_START, (week - 1) * DAYS_PER_WEEK);
  return { start, end: addDays(start, DAYS_PER_WEEK - 1) };
}

/** 指定週次第 dayIndex 天的日期 */
export function getDateForWeekDay(week: WeekNumber, dayIndex: DayIndex): IsoDate {
  return addDays(getWeekRange(week).start, dayIndex - 1);
}

/** 距離考試還有幾天。考試當天為 0，考後為負數。 */
export function getDaysUntilExam(today: IsoDate): number {
  return daysBetween(today, EXAM_DATE);
}

/** 已經過的複習天數（第 1 天為 1）。開始前為 0，結束後上限為 119。 */
export function getElapsedStudyDays(today: IsoDate): number {
  const offset = daysBetween(COURSE_START, today);
  if (offset < 0) return 0;
  return Math.min(offset + 1, TOTAL_WEEKS * DAYS_PER_WEEK);
}

/** 整體時間進度 0–1（依日期，非依完成度） */
export function getTimeProgressRatio(today: IsoDate): number {
  const total = TOTAL_WEEKS * DAYS_PER_WEEK;
  return Math.min(Math.max(getElapsedStudyDays(today) / total, 0), 1);
}

// ---------------------------------------------------------------------------
// 顯示格式化
// ---------------------------------------------------------------------------

const displayFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const shortFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'UTC',
  month: 'numeric',
  day: 'numeric',
});

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

function toUtcDate(iso: IsoDate): Date {
  return new Date(toEpochDay(iso) * MS_PER_DAY);
}

/** '2026年8月9日' */
export function formatDisplayDate(iso: IsoDate): string {
  return displayFormatter.format(toUtcDate(iso));
}

/** '8/9' */
export function formatShortDate(iso: IsoDate): string {
  return shortFormatter.format(toUtcDate(iso));
}

/** '星期日' */
export function formatWeekday(iso: IsoDate): string {
  return `星期${WEEKDAY_LABELS[getDayOfWeek(iso)]}`;
}

/** '2026年8月9日（日）' */
export function formatDateWithWeekday(iso: IsoDate): string {
  return `${formatDisplayDate(iso)}（${WEEKDAY_LABELS[getDayOfWeek(iso)]}）`;
}

/** '8/9 – 8/15' */
export function formatWeekRange(week: WeekNumber): string {
  const { start, end } = getWeekRange(week);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}
