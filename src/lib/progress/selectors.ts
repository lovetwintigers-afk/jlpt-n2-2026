/**
 * 從進度資料算出畫面要顯示的數字。
 * 全部是純函式，可以單獨測試。
 */

import { getDayItems } from '@/lib/content/queries';
import { getWeekOutline, type Skill } from '@/lib/course/outline';
import { taskKey, taskSkill } from './taskKey';
import type { MistakeRecord, ProgressSnapshot, QuizAttempt } from './schema';
import { TOTAL_WEEKS } from '@/lib/date/courseCalendar';

export interface WeekProgress {
  week: number;
  /** 計入完成率、且已經有內容的任務總數 */
  total: number;
  done: number;
  /** 0–1；沒有任何任務時為 0 */
  rate: number;
  /** 應該有內容但還沒建立的天數 */
  daysWithoutContent: number;
  /** 是否已達成本週完成條件 */
  complete: boolean;
}

/**
 * 計算某一週的完成率。
 *
 * 分母只算「計入完成率、而且已經有內容」的任務。
 * 尚未撰寫內容的天數不列入分母 —— 否則完成率會因為「我還沒寫內容」
 * 而永遠到不了 100%，那是在懲罰使用者。
 */
export function getWeekProgress(state: ProgressSnapshot, week: number): WeekProgress {
  const outline = getWeekOutline(week);
  if (!outline) {
    return { week, total: 0, done: 0, rate: 0, daysWithoutContent: 0, complete: false };
  }

  let total = 0;
  let done = 0;
  let daysWithoutContent = 0;

  for (const day of outline.days) {
    if (!day.countsTowardCompletion) continue;
    const items = getDayItems(week, day.dayIndex);
    if (items.length === 0) {
      daysWithoutContent++;
      continue;
    }
    for (const item of items) {
      total++;
      if (state.tasks[taskKey(week, day.dayIndex, item)]?.status === 'done') done++;
    }
  }

  const rate = total === 0 ? 0 : done / total;
  return {
    week,
    total,
    done,
    rate,
    daysWithoutContent,
    complete: total > 0 && done === total,
  };
}

export interface DayProgress {
  total: number;
  done: number;
  complete: boolean;
}

export function getDayProgress(
  state: ProgressSnapshot,
  week: number,
  dayIndex: number,
): DayProgress {
  const items = getDayItems(week, dayIndex);
  const done = items.filter(
    (item) => state.tasks[taskKey(week, dayIndex, item)]?.status === 'done',
  ).length;
  return { total: items.length, done, complete: items.length > 0 && done === items.length };
}

/** 四項能力的任務完成狀況（本週） */
export function getSkillProgressForWeek(
  state: ProgressSnapshot,
  week: number,
): Record<Skill, { total: number; done: number; rate: number | null }> {
  const result = {
    vocabulary: { total: 0, done: 0, rate: null as number | null },
    grammar: { total: 0, done: 0, rate: null as number | null },
    reading: { total: 0, done: 0, rate: null as number | null },
    listening: { total: 0, done: 0, rate: null as number | null },
  };

  const outline = getWeekOutline(week);
  if (!outline) return result;

  for (const day of outline.days) {
    for (const item of getDayItems(week, day.dayIndex)) {
      const skill = taskSkill(item);
      if (!skill) continue;
      result[skill].total++;
      if (state.tasks[taskKey(week, day.dayIndex, item)]?.status === 'done') {
        result[skill].done++;
      }
    }
  }

  for (const skill of Object.keys(result) as Skill[]) {
    const entry = result[skill];
    entry.rate = entry.total === 0 ? null : entry.done / entry.total;
  }
  return result;
}

/** 各能力的累積作答正確率。樣本數不足時回傳 null，避免用 1 題就下結論。 */
export const MIN_SAMPLE_FOR_ACCURACY = 5;

export function getAccuracyBySkill(
  state: ProgressSnapshot,
): Record<Skill, { correct: number; total: number; accuracy: number | null }> {
  const result = {
    vocabulary: { correct: 0, total: 0, accuracy: null as number | null },
    grammar: { correct: 0, total: 0, accuracy: null as number | null },
    reading: { correct: 0, total: 0, accuracy: null as number | null },
    listening: { correct: 0, total: 0, accuracy: null as number | null },
  };

  // 每題只取最近一次作答，否則重做多次的題目會被重複計算
  const latest = new Map<string, (typeof state.answers)[number]>();
  for (const answer of state.answers) {
    const previous = latest.get(answer.questionId);
    if (!previous || answer.answeredAt >= previous.answeredAt) {
      latest.set(answer.questionId, answer);
    }
  }

  for (const answer of latest.values()) {
    const entry = result[answer.skill];
    entry.total++;
    if (answer.isCorrect) entry.correct++;
  }

  for (const skill of Object.keys(result) as Skill[]) {
    const entry = result[skill];
    entry.accuracy =
      entry.total >= MIN_SAMPLE_FOR_ACCURACY ? entry.correct / entry.total : null;
  }
  return result;
}

/** 目前最弱的能力。樣本不足時回傳 null，不亂猜。 */
export function getWeakestSkill(state: ProgressSnapshot): Skill | null {
  const accuracy = getAccuracyBySkill(state);
  const scored = (Object.keys(accuracy) as Skill[])
    .map((skill) => ({ skill, value: accuracy[skill].accuracy }))
    .filter((entry): entry is { skill: Skill; value: number } => entry.value !== null);

  if (scored.length === 0) return null;
  scored.sort((a, b) => a.value - b.value);
  return scored[0]!.skill;
}

export function getUnresolvedMistakeCount(state: ProgressSnapshot): number {
  return Object.values(state.mistakes).filter((m) => !m.resolved).length;
}

export function getLatestQuizAttempt(state: ProgressSnapshot): QuizAttempt | null {
  if (state.quizAttempts.length === 0) return null;
  return [...state.quizAttempts].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  )[state.quizAttempts.length - 1]!;
}

/** 整體完成率（全部 17 週） */
export function getOverallProgress(state: ProgressSnapshot): {
  total: number;
  done: number;
  rate: number;
  weeksComplete: number;
} {
  let total = 0;
  let done = 0;
  let weeksComplete = 0;

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const progress = getWeekProgress(state, week);
    total += progress.total;
    done += progress.done;
    if (progress.complete) weeksComplete++;
  }
  return { total, done, rate: total === 0 ? 0 : done / total, weeksComplete };
}

/**
 * 落後的週次：已經過去、有內容、但沒做完的週。
 * 用於儀表板的「還有 N 項可以補做」，不阻擋任何東西。
 */
export function getWeeksBehind(
  state: ProgressSnapshot,
  currentWeek: number,
): { week: number; remaining: number }[] {
  const result: { week: number; remaining: number }[] = [];
  for (let week = 1; week < currentWeek; week++) {
    const progress = getWeekProgress(state, week);
    if (progress.total > 0 && progress.done < progress.total) {
      result.push({ week, remaining: progress.total - progress.done });
    }
  }
  return result;
}

/**
 * 間隔複習抽題：從 lookbackWeeks 週內答錯、尚未消化的題目中挑出最該重做的。
 * 排序依據：錯的次數多的優先，其次是比較久沒碰的。
 */
export function selectSpacedReview(
  state: ProgressSnapshot,
  currentWeek: number,
  lookbackWeeks: number,
  count: number,
): MistakeRecord[] {
  const minWeek = Math.max(1, currentWeek - lookbackWeeks);
  return Object.values(state.mistakes)
    .filter((m) => !m.resolved && m.week >= minWeek && m.week <= currentWeek)
    .sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return a.lastAttemptAt.localeCompare(b.lastAttemptAt);
    })
    .slice(0, count);
}

/** 距離上次備份幾天。從未備份時回傳 null。 */
export function daysSinceBackup(state: ProgressSnapshot, today: string): number | null {
  const last = state.settings.lastBackupAt;
  if (!last) return null;
  const toDays = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
    return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
  };
  return toDays(today) - toDays(last);
}

/** 有沒有值得記錄的進度（用來決定要不要提醒備份） */
export function hasMeaningfulProgress(state: ProgressSnapshot): boolean {
  return (
    Object.keys(state.tasks).length > 0 ||
    state.answers.length > 0 ||
    state.quizAttempts.length > 0
  );
}
