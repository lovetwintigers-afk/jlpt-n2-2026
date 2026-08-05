import { describe, it, expect } from 'vitest';
import {
  getWeekProgress,
  getDayProgress,
  getSkillProgressForWeek,
  getAccuracyBySkill,
  getWeakestSkill,
  getWeeksBehind,
  getOverallProgress,
  selectSpacedReview,
  daysSinceBackup,
  hasMeaningfulProgress,
  MIN_SAMPLE_FOR_ACCURACY,
} from './selectors';
import { taskKey } from './taskKey';
import { createEmptySnapshot, type ProgressSnapshot, type UserAnswer } from './schema';
import { getDayItems } from '@/lib/content/queries';

const NOW = '2026-08-16T10:00:00.000Z';

function emptyState() {
  return createEmptySnapshot(NOW);
}

/** 把某一週某一天的所有任務標記為完成 */
function completeDay(state: ProgressSnapshot, week: number, dayIndex: number): ProgressSnapshot {
  const tasks = { ...state.tasks };
  for (const item of getDayItems(week, dayIndex)) {
    tasks[taskKey(week, dayIndex, item)] = {
      status: 'done',
      completedAt: '2026-08-16',
      manualOverride: true,
    };
  }
  return { ...state, tasks };
}

function withAnswers(state: ProgressSnapshot, answers: Partial<UserAnswer>[]): ProgressSnapshot {
  return {
    ...state,
    answers: answers.map((a, i) => ({
      questionId: `q-${i}`,
      attemptNo: 1,
      selected: 'A',
      isCorrect: true,
      elapsedMs: 1000,
      answeredAt: NOW,
      week: 1,
      skill: 'vocabulary',
      ...a,
    })),
  };
}

describe('每日完成度', () => {
  it('沒做任何事時是 0', () => {
    const progress = getDayProgress(emptyState(), 2, 1);
    expect(progress.done).toBe(0);
    expect(progress.total).toBeGreaterThan(0);
    expect(progress.complete).toBe(false);
  });

  it('全部標記完成後為 complete', () => {
    const state = completeDay(emptyState(), 2, 1);
    const progress = getDayProgress(state, 2, 1);
    expect(progress.done).toBe(progress.total);
    expect(progress.complete).toBe(true);
  });

  it('沒有內容的天數 total 為 0，且不算 complete', () => {
    const progress = getDayProgress(emptyState(), 10, 1);
    expect(progress.total).toBe(0);
    expect(progress.complete).toBe(false);
  });
});

describe('每週完成率', () => {
  it('第 2 週全部完成後為 100%', () => {
    let state = emptyState();
    for (const day of [1, 2, 3, 4, 5, 6]) state = completeDay(state, 2, day);
    const progress = getWeekProgress(state, 2);
    expect(progress.rate).toBe(1);
    expect(progress.complete).toBe(true);
  });

  it('彈性日（第 7 天）不列入分母', () => {
    let state = emptyState();
    for (const day of [1, 2, 3, 4, 5, 6]) state = completeDay(state, 2, day);
    // 第 7 天沒做也已經是 100%
    expect(getWeekProgress(state, 2).complete).toBe(true);
  });

  it('尚未撰寫內容的天數不列入分母，但會另外回報', () => {
    // 第 1 週的第 7 天沒有內容，其餘 1–6 天都有
    const progress = getWeekProgress(emptyState(), 1);
    expect(progress.total).toBeGreaterThan(0);
    expect(progress.daysWithoutContent).toBe(0);
  });

  it('完全沒有內容的週次不會出錯，完成率為 0', () => {
    const progress = getWeekProgress(emptyState(), 10);
    expect(progress.total).toBe(0);
    expect(progress.rate).toBe(0);
    expect(progress.complete).toBe(false);
    expect(progress.daysWithoutContent).toBe(6);
  });

  it('不存在的週次回傳空結果', () => {
    expect(getWeekProgress(emptyState(), 99).total).toBe(0);
  });

  it('部分完成時比例正確', () => {
    const state = completeDay(emptyState(), 2, 1);
    const progress = getWeekProgress(state, 2);
    const day1 = getDayProgress(state, 2, 1);
    expect(progress.done).toBe(day1.total);
    expect(progress.rate).toBeCloseTo(day1.total / progress.total, 6);
  });
});

describe('四項能力的任務完成狀況', () => {
  it('第 2 週的語彙與文法都有任務', () => {
    const progress = getSkillProgressForWeek(emptyState(), 2);
    expect(progress.vocabulary.total).toBeGreaterThan(0);
    expect(progress.grammar.total).toBeGreaterThan(0);
  });

  it('沒有任務的能力回傳 null 而不是 0%（兩者意思不同）', () => {
    const progress = getSkillProgressForWeek(emptyState(), 2);
    expect(progress.listening.total).toBe(0);
    expect(progress.listening.rate).toBeNull();
  });

  it('完成語彙任務後語彙的比例上升', () => {
    const state = completeDay(emptyState(), 2, 1);
    const progress = getSkillProgressForWeek(state, 2);
    expect(progress.vocabulary.rate).toBe(1);
  });
});

describe('累積正確率', () => {
  it('樣本數不足時回傳 null，不用一兩題就下結論', () => {
    const state = withAnswers(emptyState(), [
      { questionId: 'a', skill: 'reading', isCorrect: false },
      { questionId: 'b', skill: 'reading', isCorrect: false },
    ]);
    expect(getAccuracyBySkill(state).reading.accuracy).toBeNull();
    expect(getWeakestSkill(state)).toBeNull();
  });

  it('達到樣本數後才計算', () => {
    const answers = Array.from({ length: MIN_SAMPLE_FOR_ACCURACY }, (_, i) => ({
      questionId: `r-${i}`,
      skill: 'reading' as const,
      isCorrect: i < 3,
    }));
    const state = withAnswers(emptyState(), answers);
    expect(getAccuracyBySkill(state).reading.accuracy).toBeCloseTo(3 / 5, 6);
  });

  it('同一題重做多次只算最近一次，不會被重複計算', () => {
    const state = withAnswers(emptyState(), [
      ...Array.from({ length: 4 }, (_, i) => ({
        questionId: `g-${i}`,
        skill: 'grammar' as const,
        isCorrect: true,
      })),
      { questionId: 'g-x', skill: 'grammar', isCorrect: false, answeredAt: '2026-08-16T10:00:00.000Z' },
      { questionId: 'g-x', skill: 'grammar', isCorrect: true, answeredAt: '2026-08-18T10:00:00.000Z' },
    ]);
    const accuracy = getAccuracyBySkill(state).grammar;
    expect(accuracy.total).toBe(5); // 不是 6
    expect(accuracy.accuracy).toBe(1); // 最近一次是答對
  });

  it('最弱能力挑出正確率最低的那一項', () => {
    const answers = [
      ...Array.from({ length: 5 }, (_, i) => ({
        questionId: `v-${i}`,
        skill: 'vocabulary' as const,
        isCorrect: true,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        questionId: `l-${i}`,
        skill: 'listening' as const,
        isCorrect: i === 0,
      })),
    ];
    expect(getWeakestSkill(withAnswers(emptyState(), answers))).toBe('listening');
  });
});

describe('落後的週次', () => {
  it('沒有落後時是空陣列', () => {
    let state = emptyState();
    for (const day of [1, 2, 3, 4, 5, 6]) state = completeDay(state, 1, day);
    expect(getWeeksBehind(state, 2)).toEqual([]);
  });

  it('前面的週次沒做完會被列出來，並算出剩幾項', () => {
    const behind = getWeeksBehind(emptyState(), 3);
    expect(behind.map((b) => b.week)).toEqual([1, 2]);
    expect(behind[0]!.remaining).toBeGreaterThan(0);
  });

  it('不會把本週或未來的週次算成落後', () => {
    const behind = getWeeksBehind(emptyState(), 2);
    expect(behind.map((b) => b.week)).toEqual([1]);
  });

  it('沒有內容的週次不算落後（不能因為我還沒寫內容就說我落後）', () => {
    const behind = getWeeksBehind(emptyState(), 12);
    expect(behind.map((b) => b.week)).toEqual([1, 2]);
  });
});

describe('整體進度', () => {
  it('空白狀態時完成數為 0', () => {
    const overall = getOverallProgress(emptyState());
    expect(overall.done).toBe(0);
    expect(overall.total).toBeGreaterThan(0);
    expect(overall.weeksComplete).toBe(0);
  });

  it('完成第 2 週後 weeksComplete 為 1', () => {
    let state = emptyState();
    for (const day of [1, 2, 3, 4, 5, 6]) state = completeDay(state, 2, day);
    expect(getOverallProgress(state).weeksComplete).toBe(1);
  });
});

describe('間隔複習抽題', () => {
  function stateWithMistakes(): ProgressSnapshot {
    const state = emptyState();
    state.mistakes = {
      old: {
        questionId: 'old', skill: 'grammar', week: 1, tags: [],
        firstWrongAt: NOW, lastAttemptAt: '2026-08-10T00:00:00.000Z',
        wrongCount: 1, retryCount: 0, lastResult: 'wrong', consecutiveCorrect: 0, resolved: false,
      },
      frequent: {
        questionId: 'frequent', skill: 'grammar', week: 2, tags: [],
        firstWrongAt: NOW, lastAttemptAt: '2026-08-15T00:00:00.000Z',
        wrongCount: 3, retryCount: 2, lastResult: 'wrong', consecutiveCorrect: 0, resolved: false,
      },
      resolved: {
        questionId: 'resolved', skill: 'grammar', week: 2, tags: [],
        firstWrongAt: NOW, lastAttemptAt: NOW,
        wrongCount: 1, retryCount: 2, lastResult: 'correct', consecutiveCorrect: 2, resolved: true,
      },
      manyWrongWeek1: {
        questionId: 'manyWrongWeek1', skill: 'grammar', week: 1, tags: [],
        firstWrongAt: NOW, lastAttemptAt: NOW,
        wrongCount: 5, retryCount: 0, lastResult: 'wrong', consecutiveCorrect: 0, resolved: false,
      },
    };
    return state;
  }

  it('已消化的錯題不會被抽到', () => {
    const picked = selectSpacedReview(stateWithMistakes(), 2, 2, 10);
    expect(picked.map((m) => m.questionId)).not.toContain('resolved');
  });

  it('只抽回顧範圍內的週次', () => {
    const picked = selectSpacedReview(stateWithMistakes(), 3, 1, 10);
    // currentWeek=3、lookback=1 → 只取第 2、3 週
    expect(picked.map((m) => m.questionId).sort()).toEqual(['frequent']);
  });

  it('錯比較多次的優先（5 次 > 3 次 > 1 次）', () => {
    const picked = selectSpacedReview(stateWithMistakes(), 2, 2, 10);
    expect(picked.map((m) => m.questionId)).toEqual(['manyWrongWeek1', 'frequent', 'old']);
  });

  it('錯的次數相同時，比較久沒碰的優先', () => {
    const state = stateWithMistakes();
    state.mistakes['frequent']!.wrongCount = 1; // 與 old 同為 1 次
    const picked = selectSpacedReview(state, 2, 2, 10).filter((m) =>
      ['old', 'frequent'].includes(m.questionId),
    );
    expect(picked.map((m) => m.questionId)).toEqual(['old', 'frequent']);
  });

  it('數量上限有效', () => {
    expect(selectSpacedReview(stateWithMistakes(), 2, 2, 1)).toHaveLength(1);
  });

  it('沒有錯題時回傳空陣列', () => {
    expect(selectSpacedReview(emptyState(), 5, 2, 8)).toEqual([]);
  });
});

describe('備份提醒', () => {
  it('從未備份時回傳 null', () => {
    expect(daysSinceBackup(emptyState(), '2026-08-16')).toBeNull();
  });

  it('算得出距離上次備份幾天（跨月正確）', () => {
    const state = emptyState();
    state.settings.lastBackupAt = '2026-08-30';
    expect(daysSinceBackup(state, '2026-09-05')).toBe(6);
  });

  it('沒有任何進度時不需要提醒備份', () => {
    expect(hasMeaningfulProgress(emptyState())).toBe(false);
  });

  it('做過任務之後就值得備份了', () => {
    const state = completeDay(emptyState(), 2, 1);
    expect(hasMeaningfulProgress(state)).toBe(true);
  });
});
