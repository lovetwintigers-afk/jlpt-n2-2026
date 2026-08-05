import { describe, it, expect } from 'vitest';
import {
  progressReducer,
  nextAttemptNo,
  unresolvedMistakes,
  RESOLVE_THRESHOLD,
  MAX_ANSWERS,
  KEEP_ATTEMPTS_PER_QUESTION,
} from './reducer';
import { createEmptySnapshot, type ProgressSnapshot, type UserAnswer } from './schema';

const NOW = '2026-08-16T10:00:00.000Z';
const TODAY = '2026-08-16';

function emptyState(): ProgressSnapshot {
  return createEmptySnapshot(NOW);
}

function answer(overrides: Partial<UserAnswer> = {}): UserAnswer {
  return {
    questionId: 'q-1',
    quizId: 'quiz-1',
    attemptNo: 1,
    selected: 'A',
    isCorrect: true,
    elapsedMs: 5000,
    answeredAt: NOW,
    week: 2,
    skill: 'grammar',
    ...overrides,
  };
}

function submitAction(answers: UserAnswer[], at = NOW) {
  return {
    type: 'quiz/submit' as const,
    attempt: {
      id: `attempt-${at}`,
      quizId: 'quiz-1',
      week: 2,
      kind: 'weekly-review' as const,
      startedAt: at,
      submittedAt: at,
      elapsedMs: 60000,
      totalCount: answers.length,
      correctCount: answers.filter((a) => a.isCorrect).length,
      unansweredCount: answers.filter((a) => a.selected === null).length,
      timedOut: false,
    },
    answers,
    questionMeta: {},
  };
}

describe('任務完成標記', () => {
  it('標記完成會記錄日期，並標為手動覆寫', () => {
    const state = progressReducer(emptyState(), {
      type: 'task/setDone',
      key: 'w2d1:vocabulary:voc-w02',
      done: true,
      today: TODAY,
    });
    expect(state.tasks['w2d1:vocabulary:voc-w02']).toEqual({
      status: 'done',
      completedAt: TODAY,
      manualOverride: true,
    });
  });

  it('取消完成會清掉完成日期', () => {
    let state = progressReducer(emptyState(), {
      type: 'task/setDone',
      key: 'k',
      done: true,
      today: TODAY,
    });
    state = progressReducer(state, { type: 'task/setDone', key: 'k', done: false, today: TODAY });
    expect(state.tasks['k']!.status).toBe('not-started');
    expect(state.tasks['k']!.completedAt).toBeUndefined();
  });

  it('toggle 在兩種狀態之間切換', () => {
    let state = emptyState();
    state = progressReducer(state, { type: 'task/toggle', key: 'k', today: TODAY });
    expect(state.tasks['k']!.status).toBe('done');
    state = progressReducer(state, { type: 'task/toggle', key: 'k', today: TODAY });
    expect(state.tasks['k']!.status).toBe('not-started');
    state = progressReducer(state, { type: 'task/toggle', key: 'k', today: TODAY });
    expect(state.tasks['k']!.status).toBe('done');
  });

  it('不會動到其他任務', () => {
    let state = progressReducer(emptyState(), { type: 'task/toggle', key: 'a', today: TODAY });
    state = progressReducer(state, { type: 'task/toggle', key: 'b', today: TODAY });
    expect(Object.keys(state.tasks).sort()).toEqual(['a', 'b']);
  });

  it('是純函式，不會改到傳入的 state', () => {
    const before = emptyState();
    const snapshot = JSON.stringify(before);
    progressReducer(before, { type: 'task/toggle', key: 'k', today: TODAY });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('交卷後的錯題紀錄', () => {
  it('答對的題目不會被記成錯題', () => {
    const state = progressReducer(emptyState(), submitAction([answer({ isCorrect: true })]));
    expect(state.mistakes).toEqual({});
    expect(state.answers).toHaveLength(1);
    expect(state.quizAttempts).toHaveLength(1);
  });

  it('答錯會建立錯題紀錄', () => {
    const state = progressReducer(
      emptyState(),
      submitAction([answer({ isCorrect: false, selected: 'B' })]),
    );
    const mistake = state.mistakes['q-1']!;
    expect(mistake.wrongCount).toBe(1);
    expect(mistake.retryCount).toBe(0);
    expect(mistake.lastResult).toBe('wrong');
    expect(mistake.resolved).toBe(false);
    expect(mistake.firstWrongAt).toBe(NOW);
  });

  it('未作答視同答錯', () => {
    const state = progressReducer(
      emptyState(),
      submitAction([answer({ isCorrect: false, selected: null })]),
    );
    expect(state.mistakes['q-1']!.wrongCount).toBe(1);
  });

  it('再次答錯會累加次數，並保留第一次答錯的時間', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(
      state,
      submitAction([answer({ isCorrect: false, answeredAt: '2026-08-20T10:00:00.000Z' })], '2026-08-20T10:00:00.000Z'),
    );
    const mistake = state.mistakes['q-1']!;
    expect(mistake.wrongCount).toBe(2);
    expect(mistake.retryCount).toBe(1);
    expect(mistake.firstWrongAt).toBe(NOW);
    expect(mistake.lastAttemptAt).toBe('2026-08-20T10:00:00.000Z');
  });
});

describe('錯題的消化條件（連續答對兩次）', () => {
  it('錯 → 對 一次還不算消化', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(state, submitAction([answer({ isCorrect: true })], '2026-08-17T10:00:00.000Z'));
    expect(state.mistakes['q-1']!.consecutiveCorrect).toBe(1);
    expect(state.mistakes['q-1']!.resolved).toBe(false);
  });

  it('錯 → 對 → 對 才算消化', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    for (let i = 0; i < RESOLVE_THRESHOLD; i++) {
      state = progressReducer(
        state,
        submitAction([answer({ isCorrect: true })], `2026-08-1${7 + i}T10:00:00.000Z`),
      );
    }
    expect(state.mistakes['q-1']!.resolved).toBe(true);
    expect(unresolvedMistakes(state)).toHaveLength(0);
  });

  it('消化後又答錯會重新變成未消化，連續次數歸零', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(state, submitAction([answer({ isCorrect: true })], '2026-08-17T10:00:00.000Z'));
    state = progressReducer(state, submitAction([answer({ isCorrect: true })], '2026-08-18T10:00:00.000Z'));
    expect(state.mistakes['q-1']!.resolved).toBe(true);

    state = progressReducer(state, submitAction([answer({ isCorrect: false })], '2026-08-19T10:00:00.000Z'));
    expect(state.mistakes['q-1']!.resolved).toBe(false);
    expect(state.mistakes['q-1']!.consecutiveCorrect).toBe(0);
    expect(state.mistakes['q-1']!.wrongCount).toBe(2);
  });

  it('從來沒錯過的題目，答對再多次也不會出現在錯題本', () => {
    let state = emptyState();
    for (let i = 0; i < 3; i++) {
      state = progressReducer(state, submitAction([answer({ isCorrect: true })]));
    }
    expect(Object.keys(state.mistakes)).toHaveLength(0);
  });
});

describe('錯題原因與筆記', () => {
  it('可以標記錯誤原因', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(state, {
      type: 'mistake/setReason',
      questionId: 'q-1',
      reason: '文法混淆',
    });
    expect(state.mistakes['q-1']!.reason).toBe('文法混淆');
  });

  it('可以清掉錯誤原因', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(state, { type: 'mistake/setReason', questionId: 'q-1', reason: '粗心' });
    state = progressReducer(state, {
      type: 'mistake/setReason',
      questionId: 'q-1',
      reason: undefined,
    });
    expect(state.mistakes['q-1']!.reason).toBeUndefined();
  });

  it('對不存在的錯題操作不會出錯', () => {
    const state = emptyState();
    expect(
      progressReducer(state, { type: 'mistake/setReason', questionId: 'nope', reason: '粗心' }),
    ).toBe(state);
  });

  it('可以把已消化的錯題重新放回複習清單', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    state = progressReducer(state, submitAction([answer({ isCorrect: true })], '2026-08-17T10:00:00.000Z'));
    state = progressReducer(state, submitAction([answer({ isCorrect: true })], '2026-08-18T10:00:00.000Z'));
    expect(state.mistakes['q-1']!.resolved).toBe(true);

    state = progressReducer(state, { type: 'mistake/reset', questionId: 'q-1' });
    expect(state.mistakes['q-1']!.resolved).toBe(false);
  });
});

describe('作答紀錄的修剪', () => {
  it('未超過上限時全部保留', () => {
    let state = emptyState();
    for (let i = 0; i < 10; i++) {
      state = progressReducer(state, submitAction([answer({ questionId: `q-${i}` })]));
    }
    expect(state.answers).toHaveLength(10);
  });

  it('超過上限時每題只留最近幾次，總量下降', () => {
    let state = emptyState();
    const batch: UserAnswer[] = [];
    // 200 題各作答 30 次 = 6000 筆，超過 5000 上限
    for (let q = 0; q < 200; q++) {
      for (let n = 0; n < 30; n++) {
        batch.push(
          answer({
            questionId: `q-${q}`,
            attemptNo: n + 1,
            answeredAt: `2026-08-${String((n % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
          }),
        );
      }
    }
    state = progressReducer(state, submitAction(batch));

    expect(batch.length).toBeGreaterThan(MAX_ANSWERS);
    expect(state.answers.length).toBe(200 * KEEP_ATTEMPTS_PER_QUESTION);
    for (let q = 0; q < 200; q++) {
      expect(state.answers.filter((a) => a.questionId === `q-${q}`)).toHaveLength(
        KEEP_ATTEMPTS_PER_QUESTION,
      );
    }
  });

  it('修剪後錯題的統計數字不受影響', () => {
    let state = progressReducer(emptyState(), submitAction([answer({ isCorrect: false })]));
    const before = state.mistakes['q-1']!.wrongCount;
    const batch: UserAnswer[] = [];
    for (let q = 0; q < 200; q++) {
      for (let n = 0; n < 30; n++) batch.push(answer({ questionId: `filler-${q}`, attemptNo: n + 1 }));
    }
    state = progressReducer(state, submitAction(batch));
    expect(state.mistakes['q-1']!.wrongCount).toBe(before);
  });
});

describe('nextAttemptNo', () => {
  it('第一次作答是第 1 次', () => {
    expect(nextAttemptNo(emptyState(), 'q-1')).toBe(1);
  });

  it('作答過之後遞增', () => {
    let state = progressReducer(emptyState(), submitAction([answer()]));
    expect(nextAttemptNo(state, 'q-1')).toBe(2);
    state = progressReducer(state, submitAction([answer({ attemptNo: 2 })]));
    expect(nextAttemptNo(state, 'q-1')).toBe(3);
    expect(nextAttemptNo(state, 'q-other')).toBe(1);
  });
});

describe('自我評估與設定', () => {
  it('同一週重複填寫會覆蓋，不會累積兩筆', () => {
    let state = progressReducer(emptyState(), {
      type: 'selfAssessment/record',
      week: 2,
      answers: [{ promptIndex: 0, score: 3 }],
      today: TODAY,
    });
    state = progressReducer(state, {
      type: 'selfAssessment/record',
      week: 2,
      answers: [{ promptIndex: 0, score: 5 }],
      today: '2026-08-17',
    });
    expect(state.selfAssessments).toHaveLength(1);
    expect(state.selfAssessments[0]!.answers[0]!.score).toBe(5);
  });

  it('設定更新只改指定欄位', () => {
    const state = progressReducer(emptyState(), {
      type: 'settings/update',
      patch: { furiganaMode: 'hidden' },
    });
    expect(state.settings.furiganaMode).toBe('hidden');
    expect(state.settings.dailyMinutesTarget).toBe(20);
  });

  it('記錄備份日期', () => {
    const state = progressReducer(emptyState(), { type: 'backup/recorded', today: TODAY });
    expect(state.settings.lastBackupAt).toBe(TODAY);
  });
});
