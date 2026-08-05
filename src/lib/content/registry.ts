/**
 * 內容索引。
 *
 * content/ 底下的 JSON 會自動被載入 —— 新增一個檔案存檔即生效，
 * 不需要修改任何 .tsx，也不需要在什麼清單裡登記。
 *
 * 檔案放法：
 *   content/weeks/week-02.json        該週每天的任務
 *   content/vocabulary/w02.json       語彙集
 *   content/grammar/w02.json          文法集
 *   content/comparisons/w02.json      文法比較（陣列）
 *   content/reading/w05.json          讀解文章
 *   content/listening/w05.json        聽解題組
 *   content/questions/w02.json        題目（集中放，可被多個測驗重用）
 *   content/quizzes/xxx.json          測驗定義
 */

import type { ZodType } from 'zod';
import {
  weekContentSchema,
  vocabularySetSchema,
  grammarSetSchema,
  grammarComparisonSchema,
  readingSetSchema,
  listeningSetSchema,
  questionSetSchema,
  quizSchema,
  type WeekContent,
  type VocabularySet,
  type GrammarSet,
  type GrammarComparison,
  type ReadingPassage,
  type ListeningExercise,
  type QuizQuestion,
  type Quiz,
} from './schemas';

export interface ContentIssue {
  file: string;
  path: string;
  message: string;
}

export interface ContentIndex {
  weeks: Map<number, WeekContent>;
  vocabularySets: Map<string, VocabularySet>;
  grammarSets: Map<string, GrammarSet>;
  comparisons: Map<string, GrammarComparison>;
  passages: Map<string, ReadingPassage>;
  listening: Map<string, ListeningExercise>;
  questions: Map<string, QuizQuestion>;
  quizzes: Map<string, Quiz>;
  issues: ContentIssue[];
}

type RawModules = Record<string, unknown>;

/** 從 Vite 的 glob 結果取出 JSON 內容（eager 模式下包在 default 裡） */
function unwrap(mod: unknown): unknown {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default: unknown }).default;
  }
  return mod;
}

function validateEach<T>(
  modules: RawModules,
  schema: ZodType<T>,
  issues: ContentIssue[],
  onValid: (value: T, file: string) => void,
): void {
  for (const [file, mod] of Object.entries(modules)) {
    const result = schema.safeParse(unwrap(mod));
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({
          file,
          path: issue.path.join('.') || '(根層級)',
          message: issue.message,
        });
      }
      continue;
    }
    onValid(result.data, file);
  }
}

/** 檢查 id 是否重複；重複時記錄成 issue 而不是靜默覆蓋 */
function addUnique<T>(
  map: Map<string, T>,
  id: string,
  value: T,
  file: string,
  issues: ContentIssue[],
): void {
  if (map.has(id)) {
    issues.push({ file, path: 'id', message: `id 重複：${id}（已經在別的檔案定義過）` });
    return;
  }
  map.set(id, value);
}

export function buildContentIndex(sources: {
  weeks: RawModules;
  vocabulary: RawModules;
  grammar: RawModules;
  comparisons: RawModules;
  reading: RawModules;
  listening: RawModules;
  questions: RawModules;
  quizzes: RawModules;
}): ContentIndex {
  const issues: ContentIssue[] = [];
  const index: ContentIndex = {
    weeks: new Map(),
    vocabularySets: new Map(),
    grammarSets: new Map(),
    comparisons: new Map(),
    passages: new Map(),
    listening: new Map(),
    questions: new Map(),
    quizzes: new Map(),
    issues,
  };

  validateEach(sources.weeks, weekContentSchema, issues, (week, file) => {
    if (index.weeks.has(week.week)) {
      issues.push({ file, path: 'week', message: `第 ${week.week} 週重複定義` });
      return;
    }
    index.weeks.set(week.week, week);
  });

  validateEach(sources.vocabulary, vocabularySetSchema, issues, (set, file) => {
    addUnique(index.vocabularySets, set.setId, set, file, issues);
  });

  validateEach(sources.grammar, grammarSetSchema, issues, (set, file) => {
    addUnique(index.grammarSets, set.setId, set, file, issues);
  });

  validateEach(
    sources.comparisons,
    grammarComparisonSchema.array(),
    issues,
    (list, file) => {
      for (const item of list) {
        // cells 數量必須與 patterns 對齊，否則比較表會錯位
        for (const axis of item.axes) {
          if (axis.cells.length !== item.patterns.length) {
            issues.push({
              file,
              path: `${item.id}.axes.${axis.label}`,
              message: `比較維度「${axis.label}」有 ${axis.cells.length} 格，但有 ${item.patterns.length} 個句型`,
            });
          }
        }
        addUnique(index.comparisons, item.id, item, file, issues);
      }
    },
  );

  validateEach(sources.reading, readingSetSchema, issues, (set, file) => {
    for (const passage of set.passages) {
      addUnique(index.passages, passage.id, passage, file, issues);
    }
  });

  validateEach(sources.listening, listeningSetSchema, issues, (set, file) => {
    for (const exercise of set.exercises) {
      addUnique(index.listening, exercise.id, exercise, file, issues);
    }
  });

  validateEach(sources.questions, questionSetSchema, issues, (set, file) => {
    for (const question of set.questions) {
      addUnique(index.questions, question.id, question, file, issues);
    }
  });

  validateEach(sources.quizzes, quizSchema, issues, (quiz, file) => {
    addUnique(index.quizzes, quiz.id, quiz, file, issues);
  });

  // 交叉檢查：測驗引用的題目必須存在
  for (const [quizId, quiz] of index.quizzes) {
    for (const questionId of quiz.questionIds) {
      if (!index.questions.has(questionId)) {
        issues.push({
          file: `quizzes/${quizId}`,
          path: 'questionIds',
          message: `找不到題目 ${questionId}`,
        });
      }
    }
  }

  return index;
}

/** 把 content/ 底下的 JSON 全部載入 */
function loadFromDisk(): ContentIndex {
  return buildContentIndex({
    weeks: import.meta.glob('/content/weeks/*.json', { eager: true }),
    vocabulary: import.meta.glob('/content/vocabulary/*.json', { eager: true }),
    grammar: import.meta.glob('/content/grammar/*.json', { eager: true }),
    comparisons: import.meta.glob('/content/comparisons/*.json', { eager: true }),
    reading: import.meta.glob('/content/reading/*.json', { eager: true }),
    listening: import.meta.glob('/content/listening/*.json', { eager: true }),
    questions: import.meta.glob('/content/questions/*.json', { eager: true }),
    quizzes: import.meta.glob('/content/quizzes/*.json', { eager: true }),
  });
}

export const contentIndex: ContentIndex = loadFromDisk();

/** 開發模式下把內容錯誤印到主控台，指出檔名與欄位 */
if (import.meta.env.DEV && contentIndex.issues.length > 0) {
  console.group(`⚠️ 學習內容有 ${contentIndex.issues.length} 個問題`);
  for (const issue of contentIndex.issues) {
    console.warn(`${issue.file}\n  欄位：${issue.path}\n  ${issue.message}`);
  }
  console.groupEnd();
}
