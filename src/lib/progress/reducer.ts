/**
 * 進度變更的唯一入口。
 *
 * 純函式：給同樣的 (state, action) 永遠得到同樣的結果，不碰時間也不碰儲存。
 * 需要「現在」的動作一律把時間放在 action 裡傳進來，這樣才測得出來。
 */

import type {
  MistakeReason,
  MistakeRecord,
  ProgressSnapshot,
  QuizAttempt,
  Settings,
  UserAnswer,
} from './schema';

/** 連續答對幾次才算消化掉一題錯題 */
export const RESOLVE_THRESHOLD = 2;

/** answers 陣列的上限；超過時每題只保留最近幾次 */
export const MAX_ANSWERS = 5000;
export const KEEP_ATTEMPTS_PER_QUESTION = 3;

export type ProgressAction =
  | { type: 'task/setDone'; key: string; done: boolean; today: string }
  | { type: 'task/toggle'; key: string; today: string }
  | {
      type: 'quiz/submit';
      attempt: QuizAttempt;
      answers: UserAnswer[];
      /** 每題的能力與標籤，用於建立錯題紀錄 */
      questionMeta: Record<string, { skill: UserAnswer['skill']; week: number; tags: string[] }>;
    }
  | { type: 'mistake/setReason'; questionId: string; reason: MistakeReason | undefined }
  | { type: 'mistake/setNote'; questionId: string; note: string }
  | { type: 'mistake/reset'; questionId: string }
  | {
      type: 'selfAssessment/record';
      week: number;
      answers: { promptIndex: number; score: 1 | 2 | 3 | 4 | 5; noteZh?: string }[];
      today: string;
    }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'backup/recorded'; today: string }
  | { type: 'snapshot/replace'; snapshot: ProgressSnapshot };

export function progressReducer(
  state: ProgressSnapshot,
  action: ProgressAction,
): ProgressSnapshot {
  switch (action.type) {
    case 'task/setDone': {
      const tasks = { ...state.tasks };
      if (action.done) {
        tasks[action.key] = {
          status: 'done',
          completedAt: action.today,
          manualOverride: true,
        };
      } else {
        tasks[action.key] = { status: 'not-started', manualOverride: true };
      }
      return { ...state, tasks };
    }

    case 'task/toggle': {
      const current = state.tasks[action.key];
      const done = current?.status !== 'done';
      return progressReducer(state, { type: 'task/setDone', key: action.key, done, today: action.today });
    }

    case 'quiz/submit': {
      const answers = appendAnswers(state.answers, action.answers);
      const mistakes = { ...state.mistakes };

      for (const answer of action.answers) {
        const meta = action.questionMeta[answer.questionId];
        const existing = mistakes[answer.questionId];

        if (answer.isCorrect) {
          if (!existing) continue; // 沒錯過就不用記
          const consecutiveCorrect = existing.consecutiveCorrect + 1;
          mistakes[answer.questionId] = {
            ...existing,
            lastAttemptAt: answer.answeredAt,
            retryCount: existing.retryCount + 1,
            lastResult: 'correct',
            consecutiveCorrect,
            resolved: consecutiveCorrect >= RESOLVE_THRESHOLD,
          };
          continue;
        }

        // 答錯（含未作答）
        if (existing) {
          mistakes[answer.questionId] = {
            ...existing,
            lastAttemptAt: answer.answeredAt,
            wrongCount: existing.wrongCount + 1,
            retryCount: existing.retryCount + 1,
            lastResult: 'wrong',
            consecutiveCorrect: 0,
            resolved: false,
          };
        } else {
          mistakes[answer.questionId] = {
            questionId: answer.questionId,
            skill: meta?.skill ?? answer.skill,
            week: meta?.week ?? answer.week,
            tags: meta?.tags ?? [],
            firstWrongAt: answer.answeredAt,
            lastAttemptAt: answer.answeredAt,
            wrongCount: 1,
            retryCount: 0,
            lastResult: 'wrong',
            consecutiveCorrect: 0,
            resolved: false,
          };
        }
      }

      return {
        ...state,
        answers,
        mistakes,
        quizAttempts: [...state.quizAttempts, action.attempt],
      };
    }

    case 'mistake/setReason': {
      const existing = state.mistakes[action.questionId];
      if (!existing) return state;
      const next = { ...existing };
      if (action.reason === undefined) delete next.reason;
      else next.reason = action.reason;
      return { ...state, mistakes: { ...state.mistakes, [action.questionId]: next } };
    }

    case 'mistake/setNote': {
      const existing = state.mistakes[action.questionId];
      if (!existing) return state;
      return {
        ...state,
        mistakes: {
          ...state.mistakes,
          [action.questionId]: { ...existing, noteZh: action.note },
        },
      };
    }

    case 'mistake/reset': {
      const existing = state.mistakes[action.questionId];
      if (!existing) return state;
      return {
        ...state,
        mistakes: {
          ...state.mistakes,
          [action.questionId]: { ...existing, resolved: false, consecutiveCorrect: 0 },
        },
      };
    }

    case 'selfAssessment/record': {
      const others = state.selfAssessments.filter((a) => a.week !== action.week);
      return {
        ...state,
        selfAssessments: [
          ...others,
          { week: action.week, answers: action.answers, recordedAt: action.today },
        ].sort((a, b) => a.week - b.week),
      };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'backup/recorded':
      return { ...state, settings: { ...state.settings, lastBackupAt: action.today } };

    case 'snapshot/replace':
      return action.snapshot;
  }
}

/**
 * 加入新的作答紀錄，並在總量過大時修剪。
 * 修剪規則：每一題只保留最近 KEEP_ATTEMPTS_PER_QUESTION 次作答。
 * 統計用的彙總（正確率、錯題次數）存在 mistakes 裡，不會因為修剪而失真。
 */
function appendAnswers(existing: UserAnswer[], incoming: UserAnswer[]): UserAnswer[] {
  const all = [...existing, ...incoming];
  if (all.length <= MAX_ANSWERS) return all;

  const byQuestion = new Map<string, UserAnswer[]>();
  for (const answer of all) {
    const list = byQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    byQuestion.set(answer.questionId, list);
  }

  const kept: UserAnswer[] = [];
  for (const list of byQuestion.values()) {
    kept.push(...list.slice(-KEEP_ATTEMPTS_PER_QUESTION));
  }
  return kept.sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}

/** 下一次作答是第幾次（用於 UserAnswer.attemptNo） */
export function nextAttemptNo(state: ProgressSnapshot, questionId: string): number {
  const previous = state.answers.filter((a) => a.questionId === questionId).length;
  return previous + 1;
}

/** 尚未消化的錯題 */
export function unresolvedMistakes(state: ProgressSnapshot): MistakeRecord[] {
  return Object.values(state.mistakes).filter((m) => !m.resolved);
}
