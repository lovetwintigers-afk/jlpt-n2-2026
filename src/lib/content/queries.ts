/**
 * 內容查詢。頁面元件只透過這裡取資料，不直接碰 registry。
 *
 * 所有查詢在找不到內容時回傳 undefined / 空陣列，絕不丟例外 ——
 * 因為十七週的內容是逐週補上的，缺內容是正常狀態，不是錯誤。
 */

import { contentIndex } from './registry';
import type {
  GrammarComparison,
  GrammarSet,
  ListeningExercise,
  Quiz,
  QuizQuestion,
  ReadingPassage,
  TaskItem,
  VocabularySet,
  WeekContent,
} from './schemas';

export function getWeekContent(week: number): WeekContent | undefined {
  return contentIndex.weeks.get(week);
}

export function getDayItems(week: number, dayIndex: number): TaskItem[] {
  const day = getWeekContent(week)?.days.find((d) => d.dayIndex === dayIndex);
  return day?.items ?? [];
}

export function getVocabularySet(setId: string): VocabularySet | undefined {
  return contentIndex.vocabularySets.get(setId);
}

export function getGrammarSet(setId: string): GrammarSet | undefined {
  return contentIndex.grammarSets.get(setId);
}

export function getComparison(id: string): GrammarComparison | undefined {
  return contentIndex.comparisons.get(id);
}

export function getPassage(id: string): ReadingPassage | undefined {
  return contentIndex.passages.get(id);
}

export function getListeningExercise(id: string): ListeningExercise | undefined {
  return contentIndex.listening.get(id);
}

export function getQuestion(id: string): QuizQuestion | undefined {
  return contentIndex.questions.get(id);
}

export function getQuestions(ids: readonly string[]): QuizQuestion[] {
  return ids.map((id) => contentIndex.questions.get(id)).filter((q): q is QuizQuestion => !!q);
}

export function getQuiz(id: string): Quiz | undefined {
  return contentIndex.quizzes.get(id);
}

/** 某一週的所有語彙（跨多個語彙集） */
export function getVocabularyByWeek(week: number) {
  return [...contentIndex.vocabularySets.values()]
    .filter((set) => set.week === week)
    .flatMap((set) => set.items);
}

/** 某一週的所有文法 */
export function getGrammarByWeek(week: number) {
  return [...contentIndex.grammarSets.values()]
    .filter((set) => set.week === week)
    .flatMap((set) => set.items);
}

/** 一週的內容備妥程度，用於學習地圖標示 */
export type ContentReadiness = 'ready' | 'partial' | 'empty';

export function getWeekReadiness(week: number): ContentReadiness {
  const content = getWeekContent(week);
  if (!content || content.days.length === 0) return 'empty';
  // 標準週有 6 個計入完成率的任務日；有一半以上就算備妥
  return content.days.length >= 5 ? 'ready' : 'partial';
}

/** 這個任務項目所指向的內容是否存在 */
export function isTaskItemResolvable(item: TaskItem): boolean {
  switch (item.kind) {
    case 'vocabulary':
      return !!getVocabularySet(item.setId);
    case 'grammar':
      return !!getGrammarSet(item.setId);
    case 'comparison':
      return item.comparisonIds.every((id) => !!getComparison(id));
    case 'reading':
      return item.passageIds.every((id) => !!getPassage(id));
    case 'listening':
      return item.exerciseIds.every((id) => !!getListeningExercise(id));
    case 'kanji':
      return item.questionIds.every((id) => !!getQuestion(id));
    case 'quiz':
      return !!getQuiz(item.quizId);
    case 'mistake-review':
    case 'note':
      return true;
  }
}

/** 內容驗證問題（開發時用；正式版不顯示） */
export function getContentIssues() {
  return contentIndex.issues;
}
