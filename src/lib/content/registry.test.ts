import { describe, it, expect } from 'vitest';
import { buildContentIndex } from './registry';

const emptySources = {
  weeks: {},
  vocabulary: {},
  grammar: {},
  comparisons: {},
  reading: {},
  listening: {},
  questions: {},
  quizzes: {},
};

const validSource = { type: 'original', label: '自製' };

function makeQuestion(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    week: 2,
    skill: 'grammar',
    questionType: '文法形式の判断',
    stem: 'これは＿＿です。',
    options: [
      { key: 'A', text: 'あ' },
      { key: 'B', text: 'い' },
    ],
    answer: 'A',
    explanationZh: '說明',
    difficulty: 'N2-core',
    source: validSource,
    ...overrides,
  };
}

describe('buildContentIndex — 正常載入', () => {
  it('空的來源不會出錯', () => {
    const index = buildContentIndex(emptySources);
    expect(index.issues).toEqual([]);
    expect(index.questions.size).toBe(0);
  });

  it('把 JSON 的 default 包裝解開（Vite eager glob 的形式）', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w02.json': { default: { week: 2, questions: [makeQuestion('q-1')] } },
      },
    });
    expect(index.issues).toEqual([]);
    expect(index.questions.get('q-1')).toBeDefined();
  });

  it('也接受沒有 default 包裝的物件', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w02.json': { week: 2, questions: [makeQuestion('q-1')] },
      },
    });
    expect(index.issues).toEqual([]);
    expect(index.questions.size).toBe(1);
  });
});

describe('buildContentIndex — 抓出內容錯誤', () => {
  it('缺少必填欄位時指出檔名與欄位', () => {
    const broken = makeQuestion('q-1');
    delete (broken as Record<string, unknown>).explanationZh;
    const index = buildContentIndex({
      ...emptySources,
      questions: { '/content/questions/w02.json': { week: 2, questions: [broken] } },
    });
    expect(index.issues.length).toBeGreaterThan(0);
    expect(index.issues[0]!.file).toBe('/content/questions/w02.json');
    expect(index.issues[0]!.path).toContain('explanationZh');
  });

  it('缺少 source 欄位會失敗（強制著作權紀律）', () => {
    const broken = makeQuestion('q-1');
    delete (broken as Record<string, unknown>).source;
    const index = buildContentIndex({
      ...emptySources,
      questions: { '/content/questions/w02.json': { week: 2, questions: [broken] } },
    });
    expect(index.issues.some((i) => i.path.includes('source'))).toBe(true);
  });

  it('答案不在選項中', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w02.json': {
          week: 2,
          questions: [makeQuestion('q-1', { answer: 'D' })],
        },
      },
    });
    expect(index.issues.some((i) => i.message.includes('不在選項中'))).toBe(true);
  });

  it('選項代號重複', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w02.json': {
          week: 2,
          questions: [
            makeQuestion('q-1', {
              options: [
                { key: 'A', text: 'あ' },
                { key: 'A', text: 'い' },
              ],
            }),
          ],
        },
      },
    });
    expect(index.issues.some((i) => i.message.includes('選項代號重複'))).toBe(true);
  });

  it('振假名標註寫錯（大括號沒閉合）', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w02.json': {
          week: 2,
          questions: [makeQuestion('q-1', { stem: '今日{きょう は寒い' })],
        },
      },
    });
    expect(index.issues.some((i) => i.message.includes('缺少對應的'))).toBe(true);
  });

  it('週次超出 1–17', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/w99.json': { week: 99, questions: [makeQuestion('q-1')] },
      },
    });
    expect(index.issues.length).toBeGreaterThan(0);
  });

  it('id 在不同檔案重複時記錄成問題，不會靜默覆蓋', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/a.json': { week: 2, questions: [makeQuestion('q-dup')] },
        '/content/questions/b.json': {
          week: 3,
          questions: [makeQuestion('q-dup', { week: 3, explanationZh: '另一個' })],
        },
      },
    });
    expect(index.issues.some((i) => i.message.includes('id 重複'))).toBe(true);
    // 先載入的那一筆保留，不被覆蓋
    expect(index.questions.get('q-dup')!.explanationZh).toBe('說明');
  });

  it('同一週被定義兩次', () => {
    const index = buildContentIndex({
      ...emptySources,
      weeks: {
        '/content/weeks/week-02.json': { week: 2, days: [] },
        '/content/weeks/week-02-copy.json': { week: 2, days: [] },
      },
    });
    expect(index.issues.some((i) => i.message.includes('重複定義'))).toBe(true);
  });

  it('測驗引用了不存在的題目', () => {
    const index = buildContentIndex({
      ...emptySources,
      quizzes: {
        '/content/quizzes/x.json': {
          id: 'quiz-x',
          week: 2,
          kind: 'weekly-review',
          title: '測驗',
          questionIds: ['q-missing'],
          showAnswerMode: 'after-submit',
          source: validSource,
        },
      },
    });
    expect(index.issues.some((i) => i.message.includes('找不到題目 q-missing'))).toBe(true);
  });

  it('比較表的欄位數與句型數不一致', () => {
    const index = buildContentIndex({
      ...emptySources,
      comparisons: {
        '/content/comparisons/w02.json': [
          {
            id: 'gc-1',
            week: 2,
            title: 'A ／ B ／ C',
            patterns: [{ pattern: 'A' }, { pattern: 'B' }, { pattern: 'C' }],
            axes: [{ label: '維度一', cells: ['甲', '乙'] }],
            summaryZh: '結論',
            source: validSource,
          },
        ],
      },
    });
    expect(index.issues.some((i) => i.message.includes('2 格，但有 3 個句型'))).toBe(true);
  });

  it('一個檔案有錯不會影響其他檔案的載入', () => {
    const index = buildContentIndex({
      ...emptySources,
      questions: {
        '/content/questions/bad.json': { week: 2, questions: [makeQuestion('q-bad', { answer: 'Z' })] },
        '/content/questions/good.json': { week: 3, questions: [makeQuestion('q-good', { week: 3 })] },
      },
    });
    expect(index.issues.length).toBeGreaterThan(0);
    expect(index.questions.get('q-good')).toBeDefined();
  });
});
