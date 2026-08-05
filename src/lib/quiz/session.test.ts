import { describe, it, expect } from 'vitest';
import {
  gradeQuiz,
  toUserAnswers,
  toQuizAttempt,
  buildQuestionMeta,
  formatDuration,
  meetsPassingBar,
} from './session';
import type { Quiz, QuizQuestion } from '@/lib/content/schemas';

const source = { type: 'original' as const, label: '自製' };

function question(id: string, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id,
    week: 2,
    skill: 'grammar',
    questionType: '文法形式の判断',
    stem: '＿＿です。',
    options: [
      { key: 'A', text: 'あ' },
      { key: 'B', text: 'い' },
      { key: 'C', text: 'う' },
      { key: 'D', text: 'え' },
    ],
    answer: 'A',
    explanationZh: '說明',
    relatedVocabIds: [],
    relatedGrammarIds: [],
    difficulty: 'N2-core',
    tags: [],
    source,
    ...overrides,
  } as QuizQuestion;
}

const quiz: Quiz = {
  id: 'q-test',
  week: 2,
  kind: 'weekly-review',
  title: '測驗',
  questionIds: [],
  showAnswerMode: 'after-submit',
  source,
};

describe('計分', () => {
  it('全對', () => {
    const questions = [question('a'), question('b')];
    const result = gradeQuiz(questions, { a: 'A', b: 'A' });
    expect(result.correctCount).toBe(2);
    expect(result.accuracy).toBe(1);
    expect(result.unansweredCount).toBe(0);
  });

  it('全錯', () => {
    const questions = [question('a'), question('b')];
    const result = gradeQuiz(questions, { a: 'B', b: 'C' });
    expect(result.correctCount).toBe(0);
    expect(result.accuracy).toBe(0);
    expect(result.unansweredCount).toBe(0);
  });

  it('未作答算錯，但另外標示出來', () => {
    const questions = [question('a'), question('b')];
    const result = gradeQuiz(questions, { a: 'A' });
    expect(result.correctCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.graded[1]!.unanswered).toBe(true);
    expect(result.graded[1]!.isCorrect).toBe(false);
    expect(result.graded[1]!.selected).toBeNull();
  });

  it('空測驗不會除以零', () => {
    const result = gradeQuiz([], {});
    expect(result.accuracy).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it('保留題目順序', () => {
    const questions = [question('a'), question('b'), question('c')];
    const result = gradeQuiz(questions, {});
    expect(result.graded.map((g) => g.question.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('各能力正確率', () => {
  it('分開統計不同能力', () => {
    const questions = [
      question('v1', { skill: 'vocabulary' }),
      question('v2', { skill: 'vocabulary' }),
      question('g1', { skill: 'grammar' }),
    ];
    const result = gradeQuiz(questions, { v1: 'A', v2: 'B', g1: 'A' });
    expect(result.countsBySkill.vocabulary).toEqual({ correct: 1, total: 2 });
    expect(result.countsBySkill.grammar).toEqual({ correct: 1, total: 1 });
    expect(result.accuracyBySkill.vocabulary).toBe(0.5);
    expect(result.accuracyBySkill.grammar).toBe(1);
  });

  it('沒有出現的能力不會有欄位（0% 與「沒考」意思不同）', () => {
    const result = gradeQuiz([question('g1', { skill: 'grammar' })], { g1: 'A' });
    expect(result.accuracyBySkill.listening).toBeUndefined();
    expect('listening' in result.countsBySkill).toBe(false);
  });
});

describe('轉成作答紀錄', () => {
  it('包含每題的選擇、對錯與作答時間', () => {
    const questions = [question('a'), question('b', { skill: 'reading', week: 5 })];
    const result = gradeQuiz(questions, { a: 'A', b: 'C' });
    const answers = toUserAnswers(result, {
      quizId: 'q-test',
      answeredAt: '2026-08-16T10:00:00.000Z',
      elapsedByQuestion: { a: 12_345, b: 6_789 },
      attemptNoFor: () => 1,
    });

    expect(answers).toHaveLength(2);
    expect(answers[0]).toMatchObject({
      questionId: 'a',
      quizId: 'q-test',
      selected: 'A',
      isCorrect: true,
      elapsedMs: 12_345,
      skill: 'grammar',
      week: 2,
    });
    expect(answers[1]).toMatchObject({ selected: 'C', isCorrect: false, skill: 'reading', week: 5 });
  });

  it('沒有計時資料時作答時間為 0，不會是 NaN', () => {
    const result = gradeQuiz([question('a')], { a: 'A' });
    const answers = toUserAnswers(result, {
      quizId: 'q',
      answeredAt: '2026-08-16T10:00:00.000Z',
      attemptNoFor: () => 1,
    });
    expect(answers[0]!.elapsedMs).toBe(0);
  });

  it('attemptNo 由外部提供（重做時會遞增）', () => {
    const result = gradeQuiz([question('a')], { a: 'A' });
    const answers = toUserAnswers(result, {
      quizId: 'q',
      answeredAt: '2026-08-16T10:00:00.000Z',
      attemptNoFor: () => 3,
    });
    expect(answers[0]!.attemptNo).toBe(3);
  });
});

describe('轉成測驗紀錄', () => {
  it('記錄題數、正確數、時間與是否逾時', () => {
    const result = gradeQuiz([question('a'), question('b')], { a: 'A' });
    const attempt = toQuizAttempt(result, quiz, {
      startedAt: '2026-08-16T10:00:00.000Z',
      submittedAt: '2026-08-16T10:12:00.000Z',
      elapsedMs: 720_000,
      timedOut: true,
    });
    expect(attempt).toMatchObject({
      quizId: 'q-test',
      week: 2,
      kind: 'weekly-review',
      totalCount: 2,
      correctCount: 1,
      unansweredCount: 1,
      elapsedMs: 720_000,
      timedOut: true,
    });
    expect(attempt.id).toContain('q-test');
  });

  it('負的時間會被夾到 0', () => {
    const result = gradeQuiz([question('a')], {});
    const attempt = toQuizAttempt(result, quiz, {
      startedAt: 'x',
      submittedAt: 'y',
      elapsedMs: -500,
      timedOut: false,
    });
    expect(attempt.elapsedMs).toBe(0);
  });
});

describe('題目資訊', () => {
  it('buildQuestionMeta 帶出能力、週次與標籤', () => {
    const meta = buildQuestionMeta([question('a', { tags: ['文法形式の判断'] })]);
    expect(meta['a']).toEqual({ skill: 'grammar', week: 2, tags: ['文法形式の判断'] });
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [1_000, '0:01'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [720_000, '12:00'],
    [9_300_000, '155:00'],
  ])('%i 毫秒 → %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('負數顯示為 0:00，不會出現負時間', () => {
    expect(formatDuration(-5000)).toBe('0:00');
  });
});

describe('通過門檻', () => {
  it('沒設門檻時一律視為通過', () => {
    const result = gradeQuiz([question('a')], {});
    expect(meetsPassingBar(result, quiz)).toBe(true);
  });

  it('達到門檻', () => {
    const questions = [question('a'), question('b'), question('c'), question('d')];
    const result = gradeQuiz(questions, { a: 'A', b: 'A', c: 'A', d: 'B' }); // 75%
    expect(meetsPassingBar(result, { ...quiz, passingAccuracy: 0.7 })).toBe(true);
  });

  it('剛好等於門檻算通過', () => {
    const questions = [question('a'), question('b')];
    const result = gradeQuiz(questions, { a: 'A', b: 'B' }); // 50%
    expect(meetsPassingBar(result, { ...quiz, passingAccuracy: 0.5 })).toBe(true);
  });

  it('未達門檻', () => {
    const questions = [question('a'), question('b')];
    const result = gradeQuiz(questions, { a: 'B', b: 'B' });
    expect(meetsPassingBar(result, { ...quiz, passingAccuracy: 0.7 })).toBe(false);
  });
});
