/**
 * 內容資料的 schema。
 *
 * 這裡定義 content/*.json 該長什麼樣。手寫 JSON 打錯欄位時，
 * 載入階段就會在主控台指出「哪個檔案、哪個欄位、錯在哪」，
 * 而不是等到畫面上少一塊才發現。
 */

import { z } from 'zod';
import { parseRuby } from './ruby';

// ---------------------------------------------------------------------------
// 共用
// ---------------------------------------------------------------------------

export const weekNumberSchema = z.number().int().min(1).max(17);
export const dayIndexSchema = z.number().int().min(1).max(7);

export const difficultySchema = z.enum(['N3', 'N2-basic', 'N2-core', 'N2-advanced']);
export const skillSchema = z.enum(['vocabulary', 'grammar', 'reading', 'listening']);

/**
 * 每一筆內容都必須註明來源。
 * 這是必填欄位 —— 忘記填就載入失敗，用工具強制著作權紀律。
 */
export const sourceSchema = z.object({
  type: z.enum(['original', 'public-domain', 'user-input', 'cc-licensed', 'reference']),
  label: z.string().min(1),
  url: z.string().url().optional(),
  license: z.string().optional(),
  note: z.string().optional(),
});

/** 日文欄位：使用 `漢字{かんじ}` 標註格式，載入時解析成 RubySegment[] */
export const japaneseTextSchema = z
  .string()
  .min(1)
  .superRefine((value, ctx) => {
    try {
      parseRuby(value);
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : '振假名標註格式錯誤',
      });
    }
  });

export const exampleSchema = z.object({
  jp: japaneseTextSchema,
  zh: z.string().min(1),
  source: sourceSchema.optional(),
});

// ---------------------------------------------------------------------------
// 語彙
// ---------------------------------------------------------------------------

export const partOfSpeechSchema = z.enum([
  '名詞',
  '動詞',
  'い形容詞',
  'な形容詞',
  '副詞',
  '接続詞',
  '助詞',
  '連語',
  '表現',
  'カタカナ語',
]);

export const vocabularyItemSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  /** 標註格式的詞條，例如 '募{つの}る' */
  word: japaneseTextSchema,
  /** 全假名讀音，例如 'つのる' */
  reading: z.string().min(1),
  partOfSpeech: partOfSpeechSchema,
  meaningZh: z.string().min(1),
  examples: z.array(exampleSchema).min(1),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
  /** 近義詞、易混詞的 id */
  relatedIds: z.array(z.string()).default([]),
  note: z.string().optional(),
  source: sourceSchema,
});

export const vocabularySetSchema = z.object({
  setId: z.string().min(1),
  week: weekNumberSchema,
  title: z.string().min(1),
  items: z.array(vocabularyItemSchema).min(1),
});

// ---------------------------------------------------------------------------
// 文法
// ---------------------------------------------------------------------------

export const registerSchema = z.enum(['formal', 'neutral', 'casual', 'written', 'spoken']);

export const grammarItemSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  /** 句型本身，例如 '～ざるを得ない' */
  pattern: z.string().min(1),
  /** 接續方式 */
  connection: z.string().min(1),
  meaningZh: z.string().min(1),
  /** 語感、使用限制 —— N2 的關鍵在這裡 */
  nuanceZh: z.string().min(1),
  register: registerSchema,
  examples: z.array(exampleSchema).min(1),
  /** 常見錯誤提醒 */
  cautionZh: z.string().optional(),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
  source: sourceSchema,
});

export const grammarSetSchema = z.object({
  setId: z.string().min(1),
  week: weekNumberSchema,
  title: z.string().min(1),
  items: z.array(grammarItemSchema).min(1),
});

/** 易混淆文法比較表 */
export const grammarComparisonSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  title: z.string().min(1),
  /** 參與比較的句型（直接寫在這裡，不必先建 GrammarItem） */
  patterns: z
    .array(
      z.object({
        pattern: z.string().min(1),
        grammarId: z.string().optional(),
      }),
    )
    .min(2),
  /** 比較維度。cells 的長度必須與 patterns 相同 */
  axes: z
    .array(
      z.object({
        label: z.string().min(1),
        cells: z.array(z.string().min(1)).min(2),
      }),
    )
    .min(1),
  summaryZh: z.string().min(1),
  examples: z.array(exampleSchema).default([]),
  source: sourceSchema,
});

// ---------------------------------------------------------------------------
// 讀解
// ---------------------------------------------------------------------------

export const readingPassageSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  title: z.string().min(1),
  passageType: z.enum(['short', 'mid', 'long', 'integrated', 'info-search']),
  /** 段落陣列，每段使用標註格式 */
  paragraphs: z.array(japaneseTextSchema).min(1),
  suggestedTimeSec: z.number().int().positive(),
  vocabHints: z
    .array(
      z.object({
        term: z.string().min(1),
        reading: z.string().min(1),
        meaningZh: z.string().min(1),
      }),
    )
    .default([]),
  translationZh: z.string().optional(),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
  source: sourceSchema,
});

export const readingSetSchema = z.object({
  week: weekNumberSchema,
  passages: z.array(readingPassageSchema).min(1),
});

// ---------------------------------------------------------------------------
// 聽解
// ---------------------------------------------------------------------------

export const listeningExerciseSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  title: z.string().min(1),
  exerciseType: z.enum(['課題理解', 'ポイント理解', '概要理解', '即時応答', '統合理解']),
  /** 自備音檔路徑（放在 public/audio/）。沒有就靠 TTS 或原文。 */
  audioSrc: z.string().optional(),
  /** 給語音合成朗讀用的純文字腳本（不含振假名標註） */
  ttsScript: z.string().optional(),
  /** 原文，標註格式。預設在畫面上收合。 */
  transcript: z.array(japaneseTextSchema).min(1),
  transcriptZh: z.string().optional(),
  speakerCount: z.union([z.literal(1), z.literal(2)]),
  difficulty: difficultySchema,
  tags: z.array(z.string()).default([]),
  source: sourceSchema,
});

export const listeningSetSchema = z.object({
  week: weekNumberSchema,
  exercises: z.array(listeningExerciseSchema).min(1),
});

// ---------------------------------------------------------------------------
// 題目與測驗
// ---------------------------------------------------------------------------

export const questionTypeSchema = z.enum([
  // 文字・語彙
  '漢字読み',
  '表記',
  '語形成',
  '文脈規定',
  '言い換え類義',
  '用法',
  // 文法
  '文法形式の判断',
  '文の組み立て',
  '文章の文法',
  // 讀解
  '内容理解(短)',
  '内容理解(中)',
  '内容理解(長)',
  '統合理解',
  '主張理解',
  '情報検索',
  // 聽解
  '課題理解',
  'ポイント理解',
  '概要理解',
  '即時応答',
  '統合理解(聴)',
]);

export const optionKeySchema = z.enum(['A', 'B', 'C', 'D']);

export const quizQuestionSchema = z
  .object({
    id: z.string().min(1),
    week: weekNumberSchema,
    skill: skillSchema,
    questionType: questionTypeSchema,
    /** 題幹，標註格式。挖空處用「＿＿」表示 */
    stem: japaneseTextSchema,
    /** 所屬的讀解文章或聽解題組 id */
    contextId: z.string().optional(),
    options: z
      .array(
        z.object({
          key: optionKeySchema,
          text: japaneseTextSchema,
        }),
      )
      .min(2)
      .max(4),
    answer: optionKeySchema,
    /** 解說必填 —— 錯題本完全依賴它 */
    explanationZh: z.string().min(1),
    /** 各選項為什麼錯。只需要寫想說明的那幾個選項，不必四個都寫。 */
    distractorNotesZh: z
      .object({
        A: z.string().optional(),
        B: z.string().optional(),
        C: z.string().optional(),
        D: z.string().optional(),
      })
      .optional(),
    relatedVocabIds: z.array(z.string()).default([]),
    relatedGrammarIds: z.array(z.string()).default([]),
    difficulty: difficultySchema,
    tags: z.array(z.string()).default([]),
    source: sourceSchema,
  })
  .superRefine((question, ctx) => {
    const keys = question.options.map((o) => o.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({ code: 'custom', message: `選項代號重複：${question.id}`, path: ['options'] });
    }
    if (!keys.includes(question.answer)) {
      ctx.addIssue({
        code: 'custom',
        message: `答案 ${question.answer} 不在選項中：${question.id}`,
        path: ['answer'],
      });
    }
  });

export const questionSetSchema = z.object({
  week: weekNumberSchema,
  questions: z.array(quizQuestionSchema).min(1),
});

export const quizSchema = z.object({
  id: z.string().min(1),
  week: weekNumberSchema,
  kind: z.enum(['diagnostic', 'weekly-review', 'section-mock', 'full-mock', 'drill']),
  title: z.string().min(1),
  description: z.string().optional(),
  section: z.enum(['language-knowledge', 'reading', 'listening']).optional(),
  questionIds: z.array(z.string().min(1)).min(1),
  /** 有值代表限時 */
  timeLimitSec: z.number().int().positive().optional(),
  /** 模擬考一律 after-submit，練習可用 immediate */
  showAnswerMode: z.enum(['immediate', 'after-submit']),
  passingAccuracy: z.number().min(0).max(1).optional(),
  source: sourceSchema,
});

// ---------------------------------------------------------------------------
// 每週任務對應
// ---------------------------------------------------------------------------

/** 任務只「指向」內容，不內嵌內容，因此內容可獨立更新 */
export const taskItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('vocabulary'), setId: z.string().min(1), count: z.number().int().positive().optional() }),
  z.object({ kind: z.literal('kanji'), questionIds: z.array(z.string().min(1)).min(1) }),
  z.object({ kind: z.literal('grammar'), setId: z.string().min(1) }),
  z.object({ kind: z.literal('comparison'), comparisonIds: z.array(z.string().min(1)).min(1) }),
  z.object({ kind: z.literal('reading'), passageIds: z.array(z.string().min(1)).min(1), timeLimitSec: z.number().int().positive().optional() }),
  z.object({ kind: z.literal('listening'), exerciseIds: z.array(z.string().min(1)).min(1) }),
  z.object({ kind: z.literal('quiz'), quizId: z.string().min(1) }),
  z.object({
    kind: z.literal('mistake-review'),
    strategy: z.literal('spaced'),
    lookbackWeeks: z.number().int().positive(),
    count: z.number().int().positive(),
  }),
  z.object({ kind: z.literal('note'), title: z.string().min(1), body: z.string().min(1) }),
]);

export const weekContentSchema = z.object({
  week: weekNumberSchema,
  /** 每一天的任務。可以只寫其中幾天，沒寫的天數會顯示「內容尚未加入」。 */
  days: z
    .array(
      z.object({
        dayIndex: dayIndexSchema,
        items: z.array(taskItemSchema).min(1),
      }),
    )
    .default([]),
  /** 本週複習測驗 */
  reviewQuizId: z.string().optional(),
  /** 自我評估題目 */
  selfAssessmentPrompts: z.array(z.string().min(1)).default([]),
  note: z.string().optional(),
});

// ---------------------------------------------------------------------------
// 型別（一律由 schema 推導，不另外手寫，避免兩邊不同步）
// ---------------------------------------------------------------------------

export type SourceInfo = z.infer<typeof sourceSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type PartOfSpeech = z.infer<typeof partOfSpeechSchema>;
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type VocabularySet = z.infer<typeof vocabularySetSchema>;
export type GrammarItem = z.infer<typeof grammarItemSchema>;
export type GrammarSet = z.infer<typeof grammarSetSchema>;
export type GrammarComparison = z.infer<typeof grammarComparisonSchema>;
export type ReadingPassage = z.infer<typeof readingPassageSchema>;
export type ListeningExercise = z.infer<typeof listeningExerciseSchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type OptionKey = z.infer<typeof optionKeySchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type TaskItem = z.infer<typeof taskItemSchema>;
export type TaskItemKind = TaskItem['kind'];
export type WeekContent = z.infer<typeof weekContentSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
