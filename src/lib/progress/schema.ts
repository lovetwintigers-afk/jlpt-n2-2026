/**
 * 學習進度的資料結構。
 *
 * 這是「使用者產生的資料」—— 與 content/ 的學習內容完全分開。
 * 內容可以隨時重寫，進度不會受影響（兩邊靠 id 對應）。
 *
 * 所有欄位都經過 zod 驗證才會載入。localStorage 的內容有可能被
 * 舊版本、手動編輯或瀏覽器問題弄壞，驗證失敗時會保留一份損毀備份，
 * 而不是直接把十七週的紀錄丟掉。
 */

import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 1;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().min(1);
const optionKeySchema = z.enum(['A', 'B', 'C', 'D']);
const skillSchema = z.enum(['vocabulary', 'grammar', 'reading', 'listening']);

/** 錯題原因。使用者自己選，用於弱點分析。 */
export const mistakeReasonSchema = z.enum([
  '不認識單字',
  '文法沒學過',
  '文法混淆',
  '看錯題目',
  '時間不夠',
  '沒聽清楚',
  '推論錯誤',
  '粗心',
  '猜對但不確定',
]);

/** 單一任務的完成狀態 */
export const taskProgressSchema = z.object({
  status: z.enum(['not-started', 'done']),
  completedAt: isoDateSchema.optional(),
  /** 使用者手動標記過，自動判定不再覆寫 */
  manualOverride: z.boolean().default(false),
});

/** 一次作答紀錄 */
export const userAnswerSchema = z.object({
  questionId: z.string(),
  quizId: z.string().optional(),
  attemptNo: z.number().int().positive(),
  selected: optionKeySchema.nullable(),
  isCorrect: z.boolean(),
  elapsedMs: z.number().int().nonnegative(),
  answeredAt: isoDateTimeSchema,
  week: z.number().int(),
  skill: skillSchema,
});

/** 錯題 */
export const mistakeRecordSchema = z.object({
  questionId: z.string(),
  skill: skillSchema,
  week: z.number().int(),
  tags: z.array(z.string()).default([]),
  firstWrongAt: isoDateTimeSchema,
  lastAttemptAt: isoDateTimeSchema,
  wrongCount: z.number().int().nonnegative(),
  retryCount: z.number().int().nonnegative().default(0),
  lastResult: z.enum(['correct', 'wrong']),
  /** 連續答對兩次即視為已消化 */
  consecutiveCorrect: z.number().int().nonnegative().default(0),
  resolved: z.boolean().default(false),
  reason: mistakeReasonSchema.optional(),
  noteZh: z.string().optional(),
});

/** 一次測驗的結果 */
export const quizAttemptSchema = z.object({
  id: z.string(),
  quizId: z.string(),
  week: z.number().int(),
  kind: z.enum(['diagnostic', 'weekly-review', 'section-mock', 'full-mock', 'drill']),
  startedAt: isoDateTimeSchema,
  submittedAt: isoDateTimeSchema,
  elapsedMs: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  correctCount: z.number().int().nonnegative(),
  unansweredCount: z.number().int().nonnegative().default(0),
  /** 只記錄這次測驗有出現的能力，沒出現的就不會有欄位 */
  accuracyBySkill: z
    .object({
      vocabulary: z.number().optional(),
      grammar: z.number().optional(),
      reading: z.number().optional(),
      listening: z.number().optional(),
    })
    .optional(),
  /** 是否為逾時自動交卷 */
  timedOut: z.boolean().default(false),
});

/** 每週自我評估 */
export const selfAssessmentSchema = z.object({
  week: z.number().int(),
  answers: z.array(
    z.object({
      promptIndex: z.number().int().nonnegative(),
      score: z.number().int().min(1).max(5),
      noteZh: z.string().optional(),
    }),
  ),
  recordedAt: isoDateSchema,
});

export const settingsSchema = z.object({
  furiganaMode: z.enum(['always', 'hidden', 'none']).default('always'),
  dailyMinutesTarget: z.number().int().positive().default(20),
  /** 最後一次匯出備份的日期，用於提醒 */
  lastBackupAt: isoDateSchema.optional(),
  /** 發音用的語音名稱。沒設定就自動挑一個本機日文語音。 */
  speechVoiceName: z.string().optional(),
  /** 發音語速。有 default，舊的備份檔讀進來也不會缺欄位。 */
  speechRate: z.number().min(0.5).max(2).default(1),
});

export const progressSnapshotSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  settings: settingsSchema.default({
    furiganaMode: 'always',
    dailyMinutesTarget: 20,
    speechRate: 1,
  }),
  /** key 由 taskKey() 產生，與內容順序無關 */
  tasks: z.record(z.string(), taskProgressSchema).default({}),
  answers: z.array(userAnswerSchema).default([]),
  /** key = questionId */
  mistakes: z.record(z.string(), mistakeRecordSchema).default({}),
  quizAttempts: z.array(quizAttemptSchema).default([]),
  selfAssessments: z.array(selfAssessmentSchema).default([]),
});

export type TaskProgress = z.infer<typeof taskProgressSchema>;
export type UserAnswer = z.infer<typeof userAnswerSchema>;
export type MistakeRecord = z.infer<typeof mistakeRecordSchema>;
export type MistakeReason = z.infer<typeof mistakeReasonSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type SelfAssessment = z.infer<typeof selfAssessmentSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type ProgressSnapshot = z.infer<typeof progressSnapshotSchema>;

export function createEmptySnapshot(now: string): ProgressSnapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    settings: { furiganaMode: 'always', dailyMinutesTarget: 20, speechRate: 1 },
    tasks: {},
    answers: [],
    mistakes: {},
    quizAttempts: [],
    selfAssessments: [],
  };
}

/**
 * 版本遷移。
 * 未來改變資料結構時，在這裡加一個 0→1、1→2 的轉換函式，
 * 舊的進度就不會讀不出來。
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // 範例：從 0 版升到 1 版
  // 0: (data) => ({ ...data, schemaVersion: 1, quizAttempts: [] }),
};

export function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  let data = raw as Record<string, unknown>;
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) break; // 沒有對應的遷移就交給 zod 驗證去判斷
    data = step(data);
    version = typeof data.schemaVersion === 'number' ? data.schemaVersion : version + 1;
  }
  return data;
}
