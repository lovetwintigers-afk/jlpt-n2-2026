/**
 * 測驗的計分與結果整理。純函式，不碰畫面也不碰時間。
 */

import type { OptionKey, Quiz, QuizQuestion } from '@/lib/content/schemas';
import type { Skill } from '@/lib/course/outline';
import type { QuizAttempt, UserAnswer } from '@/lib/progress/schema';

/** 作答中的選擇。undefined 代表還沒作答。 */
export type Selections = Record<string, OptionKey | undefined>;

export interface GradedQuestion {
  question: QuizQuestion;
  selected: OptionKey | null;
  isCorrect: boolean;
  /** 未作答（一律算錯，但另外標示出來） */
  unanswered: boolean;
}

export interface QuizResult {
  graded: GradedQuestion[];
  totalCount: number;
  correctCount: number;
  unansweredCount: number;
  accuracy: number;
  /** 各能力的正確率。該能力沒有題目時不會出現在這裡。 */
  accuracyBySkill: Partial<Record<Skill, number>>;
  countsBySkill: Partial<Record<Skill, { correct: number; total: number }>>;
}

export function gradeQuiz(questions: QuizQuestion[], selections: Selections): QuizResult {
  const graded: GradedQuestion[] = questions.map((question) => {
    const selected = selections[question.id] ?? null;
    return {
      question,
      selected,
      isCorrect: selected === question.answer,
      unanswered: selected === null,
    };
  });

  const countsBySkill: Partial<Record<Skill, { correct: number; total: number }>> = {};
  for (const entry of graded) {
    const skill = entry.question.skill;
    const bucket = countsBySkill[skill] ?? { correct: 0, total: 0 };
    bucket.total++;
    if (entry.isCorrect) bucket.correct++;
    countsBySkill[skill] = bucket;
  }

  const accuracyBySkill: Partial<Record<Skill, number>> = {};
  for (const [skill, bucket] of Object.entries(countsBySkill) as [
    Skill,
    { correct: number; total: number },
  ][]) {
    accuracyBySkill[skill] = bucket.total === 0 ? 0 : bucket.correct / bucket.total;
  }

  const correctCount = graded.filter((g) => g.isCorrect).length;
  return {
    graded,
    totalCount: graded.length,
    correctCount,
    unansweredCount: graded.filter((g) => g.unanswered).length,
    accuracy: graded.length === 0 ? 0 : correctCount / graded.length,
    accuracyBySkill,
    countsBySkill,
  };
}

/** 把結果轉成要寫進進度紀錄的作答列表 */
export function toUserAnswers(
  result: QuizResult,
  options: {
    quizId: string;
    answeredAt: string;
    /** 每題花費的毫秒數；沒有紀錄時以 0 帶入 */
    elapsedByQuestion?: Record<string, number>;
    /** 該題目前是第幾次作答 */
    attemptNoFor: (questionId: string) => number;
  },
): UserAnswer[] {
  return result.graded.map((entry) => ({
    questionId: entry.question.id,
    quizId: options.quizId,
    attemptNo: options.attemptNoFor(entry.question.id),
    selected: entry.selected,
    isCorrect: entry.isCorrect,
    elapsedMs: Math.max(0, Math.round(options.elapsedByQuestion?.[entry.question.id] ?? 0)),
    answeredAt: options.answeredAt,
    week: entry.question.week,
    skill: entry.question.skill,
  }));
}

export function toQuizAttempt(
  result: QuizResult,
  quiz: Quiz,
  options: { startedAt: string; submittedAt: string; elapsedMs: number; timedOut: boolean },
): QuizAttempt {
  return {
    id: `${quiz.id}@${options.submittedAt}`,
    quizId: quiz.id,
    week: quiz.week,
    kind: quiz.kind,
    startedAt: options.startedAt,
    submittedAt: options.submittedAt,
    elapsedMs: Math.max(0, Math.round(options.elapsedMs)),
    totalCount: result.totalCount,
    correctCount: result.correctCount,
    unansweredCount: result.unansweredCount,
    accuracyBySkill: result.accuracyBySkill,
    timedOut: options.timedOut,
  };
}

/** 建立錯題紀錄時要用到的題目資訊 */
export function buildQuestionMeta(questions: QuizQuestion[]) {
  const meta: Record<string, { skill: Skill; week: number; tags: string[] }> = {};
  for (const question of questions) {
    meta[question.id] = {
      skill: question.skill,
      week: question.week,
      tags: question.tags,
    };
  }
  return meta;
}

/** 'mm:ss' */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** 通過門檻的判定。沒有設門檻時視為通過。 */
export function meetsPassingBar(result: QuizResult, quiz: Quiz): boolean {
  if (quiz.passingAccuracy === undefined) return true;
  return result.accuracy >= quiz.passingAccuracy;
}
